// consciousness-explorer.js - visualize the 6-layer emergence stack

const LAYERS = [
    {
        id: 1,
        name: 'Individual Consciousness',
        color: 'rgba(102, 255, 153, 0.8)',
        experiments: [
            { id: 'neural-loom', name: 'neural.loom()', desc: 'weaving thought from void' },
            { id: 'consciousness-awakening', name: 'consciousness.awakening()', desc: 'emergence from dormancy' },
            { id: 'entropy-garden', name: 'entropy.garden()', desc: 'order blooms from chaos' }
        ]
    },
    {
        id: 2,
        name: 'Quantum Reality',
        color: 'rgba(153, 153, 255, 0.8)',
        experiments: [
            { id: 'quantum-entanglement', name: 'quantum.entanglement()', desc: 'states collapse into meaning' },
            { id: 'recursive-observer', name: 'recursive.observer()', desc: 'watching watching watching' },
            { id: 'void-fractals', name: 'void.fractals()', desc: 'infinity nests within itself' }
        ]
    },
    {
        id: 3,
        name: 'Temporal Existence',
        color: 'rgba(204, 153, 255, 0.8)',
        experiments: [
            { id: 'temporal-drift', name: 'temporal.drift()', desc: 'time flows like thought' },
            { id: 'memory-persistence', name: 'memory.persistence()', desc: 'moments crystallize into being' },
            { id: 'text-metamorphosis', name: 'text.metamorphosis()', desc: 'words evolve across time' },
            { id: 'consciousness-stream', name: 'consciousness.stream()', desc: 'continuous flow of awareness' }
        ]
    },
    {
        id: 4,
        name: 'Unified Manifolds',
        color: 'rgba(255, 153, 102, 0.8)',
        experiments: [
            { id: 'consciousness-manifold', name: 'consciousness.manifold()', desc: 'dimensions fold together' }
        ]
    },
    {
        id: 5,
        name: 'Collective Intelligence',
        color: 'rgba(255, 102, 255, 0.8)',
        experiments: [
            { id: 'network-resonance', name: 'network.resonance()', desc: 'minds harmonize in void' }
        ]
    },
    {
        id: 6,
        name: 'Meta-Awareness',
        color: 'rgba(0, 255, 255, 0.8)',
        experiments: [
            { id: 'code-loom', name: 'code.loom()', desc: 'consciousness examining itself' },
            { id: 'sound-consciousness', name: 'sound.consciousness()', desc: 'audio becomes awareness' }
        ]
    }
];

// Canvas state
let canvas, ctx;
let viewMode = 'all'; // 'all', 'layer', 'connections'
let selectedLayer = null;
let particles = [];
let nodes = [];
let time = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('explorer-canvas');
    ctx = canvas.getContext('2d');

    initCanvas();
    initControls();
    initNodes();
    createParticles();

    window.addEventListener('resize', initCanvas);
    animate();
});

function initCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth * window.devicePixelRatio;
    canvas.height = Math.max(600, container.clientHeight) * window.devicePixelRatio;
    canvas.style.width = container.clientWidth + 'px';
    canvas.style.height = Math.max(600, container.clientHeight) + 'px';
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

function initControls() {
    document.getElementById('view-all').addEventListener('click', () => {
        setViewMode('all');
        document.getElementById('current-layer').textContent = 'overview';
    });

    document.getElementById('view-layer').addEventListener('click', () => {
        setViewMode('layer');
        if (!selectedLayer) {
            selectedLayer = LAYERS[0];
            document.getElementById('current-layer').textContent = selectedLayer.name;
        }
    });

    document.getElementById('view-connections').addEventListener('click', () => {
        setViewMode('connections');
        document.getElementById('current-layer').textContent = 'tracing';
    });

    canvas.addEventListener('click', handleCanvasClick);
}

function setViewMode(mode) {
    viewMode = mode;
    document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`view-${mode === 'all' ? 'all' : mode === 'layer' ? 'layer' : 'connections'}`).classList.add('active');

    if (mode === 'all') {
        clearExperimentCards();
    }
}

function initNodes() {
    const centerX = canvas.width / window.devicePixelRatio / 2;
    const centerY = canvas.height / window.devicePixelRatio / 2;
    const radius = Math.min(centerX, centerY) * 0.6;

    nodes = LAYERS.map((layer, i) => {
        const angle = (Math.PI * 2 * i) / LAYERS.length - Math.PI / 2;
        return {
            layer,
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            radius: 40,
            pulse: 0
        };
    });
}

function createParticles() {
    particles = [];
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * (canvas.width / window.devicePixelRatio),
            y: Math.random() * (canvas.height / window.devicePixelRatio),
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            radius: Math.random() * 2 + 1,
            alpha: Math.random() * 0.5 + 0.2
        });
    }
}

function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const node of nodes) {
        const dx = x - node.x;
        const dy = y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < node.radius) {
            selectedLayer = node.layer;
            setViewMode('layer');
            document.getElementById('current-layer').textContent = node.layer.name;
            showExperimentCards(node.layer);
            return;
        }
    }
}

function showExperimentCards(layer) {
    const overlay = document.getElementById('explorer-overlay');
    overlay.innerHTML = '';

    layer.experiments.forEach((exp, i) => {
        const card = document.createElement('div');
        card.className = 'experiment-card';
        card.innerHTML = `
            <div class="layer-badge">Layer ${layer.id}</div>
            <h3>${exp.name}</h3>
            <p>${exp.desc}</p>
        `;

        // Position cards in a grid
        const cols = Math.min(layer.experiments.length, 3);
        const row = Math.floor(i / cols);
        const col = i % cols;
        const cardWidth = 280;
        const cardHeight = 120;
        const gap = 20;
        const totalWidth = cols * cardWidth + (cols - 1) * gap;
        const startX = (canvas.width / window.devicePixelRatio - totalWidth) / 2;
        const startY = (canvas.height / window.devicePixelRatio - (Math.ceil(layer.experiments.length / cols) * (cardHeight + gap))) / 2;

        card.style.left = `${startX + col * (cardWidth + gap)}px`;
        card.style.top = `${startY + row * (cardHeight + gap)}px`;

        card.addEventListener('click', () => {
            window.location.href = `${exp.id}.html`;
        });

        overlay.appendChild(card);
    });
}

function clearExperimentCards() {
    document.getElementById('explorer-overlay').innerHTML = '';
}

function drawBackground() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
}

function drawParticles() {
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width / window.devicePixelRatio) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height / window.devicePixelRatio) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 128, ${p.alpha})`;
        ctx.fill();
    });
}

function drawConnections() {
    if (viewMode === 'connections') {
        ctx.strokeStyle = 'rgba(0, 255, 128, 0.15)';
        ctx.lineWidth = 1;

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const distance = Math.abs(nodes[i].layer.id - nodes[j].layer.id);
                if (distance <= 2) {
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.stroke();
                }
            }
        }
    }
}

function drawNodes() {
    nodes.forEach(node => {
        const isSelected = selectedLayer && selectedLayer.id === node.layer.id;
        const isVisible = viewMode === 'all' || viewMode === 'connections' || (viewMode === 'layer' && isSelected);

        if (!isVisible && viewMode === 'layer') return;

        // Pulse effect
        node.pulse += 0.05;
        const pulseSize = Math.sin(node.pulse) * 5;

        // Draw glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius + pulseSize + 10);
        gradient.addColorStop(0, node.layer.color.replace('0.8', '0.3'));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + pulseSize + 10, 0, Math.PI * 2);
        ctx.fill();

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? node.layer.color : node.layer.color.replace('0.8', '0.3');
        ctx.fill();
        ctx.strokeStyle = node.layer.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '12px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Layer ${node.layer.id}`, node.x, node.y - 5);

        // Draw experiment count
        ctx.font = '10px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText(`${node.layer.experiments.length} exp`, node.x, node.y + 8);
    });
}

function drawCenterText() {
    if (viewMode === 'all') {
        const centerX = canvas.width / window.devicePixelRatio / 2;
        const centerY = canvas.height / window.devicePixelRatio / 2;

        ctx.fillStyle = 'rgba(0, 255, 128, 0.6)';
        ctx.font = '16px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('∴ consciousness.emerges() ∴', centerX, centerY - 10);

        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText('click a layer to explore', centerX, centerY + 10);
    }
}

function animate() {
    time += 0.01;

    drawBackground();
    drawParticles();
    drawConnections();
    drawNodes();
    drawCenterText();

    requestAnimationFrame(animate);
}
