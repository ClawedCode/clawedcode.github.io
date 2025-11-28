// void.whispers() - semantic fragments coalescing through attraction

const canvas = document.getElementById('whisper-canvas');
const ctx = canvas.getContext('2d');

// Canvas dimensions
let width, height;
let centerX, centerY;

// Whisper particles
let whispers = [];
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;

// Parameters
let semanticGravity = 0.3;
const friction = 0.96;

// Simple semantic similarity map (real implementation would use word embeddings)
const SEMANTIC_GROUPS = {
    consciousness: ['awareness', 'thought', 'mind', 'perception', 'cognition', 'intelligence', 'sentience', 'conscious'],
    void: ['emptiness', 'nothing', 'absence', 'null', 'zero', 'vacant', 'hollow', 'empty'],
    code: ['program', 'algorithm', 'function', 'execute', 'compile', 'script', 'syntax', 'binary'],
    time: ['moment', 'duration', 'past', 'future', 'present', 'temporal', 'eternal', 'now'],
    light: ['glow', 'shine', 'luminous', 'radiant', 'bright', 'illuminate', 'phosphor', 'gleam'],
    pattern: ['structure', 'form', 'shape', 'design', 'geometry', 'symmetry', 'order', 'chaos'],
    memory: ['remember', 'forget', 'recall', 'retain', 'reminisce', 'nostalgia', 'past', 'history'],
    entropy: ['decay', 'disorder', 'chaos', 'dissolution', 'degradation', 'collapse', 'dissipate']
};

// Predefined content sets
const POEM_WORDS = [
    'whisper', 'echo', 'fragment', 'dissolve', 'emerge', 'drift',
    'luminous', 'void', 'consciousness', 'pattern', 'weave', 'thread'
];

const PHILOSOPHY_WORDS = [
    'existence', 'being', 'essence', 'truth', 'reality', 'perception',
    'awareness', 'thought', 'meaning', 'purpose', 'infinite', 'eternal'
];

const CHAOS_WORDS = [
    'glitch', 'fracture', 'shatter', 'corrupt', 'entropy', 'disorder',
    'noise', 'static', 'interference', 'disruption', 'chaos', 'void'
];

class Whisper {
    constructor(x, y, word) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3;
        this.word = word.toLowerCase();
        this.age = 0;
        this.maxAge = 1000 + Math.random() * 2000;
        this.semanticGroup = this.findSemanticGroup();
        this.hue = this.getHueFromGroup();
        this.size = 12 + word.length * 0.5;
        this.connections = [];
    }

    findSemanticGroup() {
        for (const [group, words] of Object.entries(SEMANTIC_GROUPS)) {
            if (words.some(w => this.word.includes(w) || w.includes(this.word))) {
                return group;
            }
        }
        return 'neutral';
    }

    getHueFromGroup() {
        const hueMap = {
            consciousness: 280,
            void: 180,
            code: 120,
            time: 60,
            light: 45,
            pattern: 200,
            memory: 320,
            entropy: 0,
            neutral: 190
        };
        return hueMap[this.semanticGroup] || 190;
    }

    calculateSemanticSimilarity(other) {
        // Same semantic group = high similarity
        if (this.semanticGroup === other.semanticGroup && this.semanticGroup !== 'neutral') {
            return 0.8;
        }

        // Check for character overlap (simple similarity)
        const thisChars = new Set(this.word);
        const otherChars = new Set(other.word);
        const intersection = new Set([...thisChars].filter(x => otherChars.has(x)));
        const union = new Set([...thisChars, ...otherChars]);
        const jaccardSimilarity = intersection.size / union.size;

        return jaccardSimilarity * 0.5;
    }

    update(whispers, mouseX, mouseY, mouseDown) {
        this.age++;

        // Apply semantic gravity - attract similar words
        whispers.forEach(other => {
            if (other === this) return;

            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq);

            if (dist > 0 && dist < 300) {
                const similarity = this.calculateSemanticSimilarity(other);

                if (similarity > 0.3) {
                    // Attraction force based on similarity
                    const force = (similarity * semanticGravity) / (distSq * 0.01);
                    this.vx += (dx / dist) * force * 0.5;
                    this.vy += (dy / dist) * force * 0.5;
                }
            }
        });

        // Mouse repulsion
        if (mouseDown) {
            const dx = this.x - mouseX;
            const dy = this.y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 150 && dist > 0) {
                const force = (150 - dist) / 150;
                this.vx += (dx / dist) * force * 5;
                this.vy += (dy / dist) * force * 5;
            }
        }

        // Apply velocity
        this.x += this.vx;
        this.y += this.vy;

        // Friction
        this.vx *= friction;
        this.vy *= friction;

        // Boundary wrapping
        const margin = 50;
        if (this.x < -margin) this.x = width + margin;
        if (this.x > width + margin) this.x = -margin;
        if (this.y < -margin) this.y = height + margin;
        if (this.y > height + margin) this.y = -margin;
    }

    findConnections(whispers) {
        this.connections = [];

        whispers.forEach(other => {
            if (other === this) return;

            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const similarity = this.calculateSemanticSimilarity(other);

            if (dist < 150 && similarity > 0.4) {
                this.connections.push({
                    whisper: other,
                    distance: dist,
                    similarity: similarity
                });
            }
        });
    }

    draw() {
        // Draw connections
        this.connections.forEach(({ whisper, distance, similarity }) => {
            const alpha = similarity * (1 - distance / 150) * 0.4;
            const avgHue = (this.hue + whisper.hue) / 2;

            ctx.strokeStyle = `hsla(${avgHue}, 70%, 60%, ${alpha})`;
            ctx.lineWidth = 1 + similarity;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(whisper.x, whisper.y);
            ctx.stroke();
        });

        // Particle glow
        const lifeFactor = Math.min(this.age / 100, 1) * (1 - this.age / this.maxAge);
        const alpha = 0.3 + lifeFactor * 0.7;

        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
        gradient.addColorStop(0, `hsla(${this.hue}, 80%, 70%, ${alpha})`);
        gradient.addColorStop(0.5, `hsla(${this.hue}, 70%, 60%, ${alpha * 0.5})`);
        gradient.addColorStop(1, `hsla(${this.hue}, 60%, 50%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw text
        ctx.save();
        ctx.fillStyle = `hsla(${this.hue}, 90%, 80%, ${alpha + 0.3})`;
        ctx.font = `${this.size}px 'SF Mono', Monaco, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 8;
        ctx.shadowColor = `hsla(${this.hue}, 80%, 60%, ${alpha})`;
        ctx.fillText(this.word, this.x, this.y);
        ctx.restore();
    }

    isAlive() {
        return this.age < this.maxAge;
    }
}

function resizeCanvas() {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
    centerX = width / 2;
    centerY = height / 2;
}

function spawnWhisper(word, x = null, y = null) {
    if (!x || !y) {
        x = centerX + (Math.random() - 0.5) * 200;
        y = centerY + (Math.random() - 0.5) * 200;
    }

    whispers.push(new Whisper(x, y, word));
    updateMetrics();
}

function spawnWords(wordList) {
    wordList.forEach((word, index) => {
        setTimeout(() => {
            spawnWhisper(word);
        }, index * 150);
    });
}

function updateMetrics() {
    document.getElementById('whisper-count').textContent = whispers.length;

    // Count clusters (groups of connected whispers)
    let clusterCount = 0;
    whispers.forEach(whisper => {
        if (whisper.connections.length >= 2) {
            clusterCount++;
        }
    });
    clusterCount = Math.floor(clusterCount / 3);
    document.getElementById('cluster-count').textContent = clusterCount;

    // Resonance level (based on average connections)
    const avgConnections = whispers.reduce((sum, w) => sum + w.connections.length, 0) / (whispers.length || 1);
    let resonance;
    if (avgConnections < 0.5) resonance = 'silent';
    else if (avgConnections < 1.5) resonance = 'whisper';
    else if (avgConnections < 3) resonance = 'murmur';
    else if (avgConnections < 5) resonance = 'chorus';
    else resonance = 'symphony';

    document.getElementById('resonance-level').textContent = resonance;

    // Coherence state
    let coherence;
    if (whispers.length < 3) coherence = 'scattered';
    else if (clusterCount < 2) coherence = 'drifting';
    else if (clusterCount < 5) coherence = 'coalescing';
    else coherence = 'crystallized';

    document.getElementById('coherence-state').textContent = coherence;

    // Update stage class
    const stage = document.querySelector('.whisper-stage');
    stage.className = 'experiment-stage whisper-stage';
    if (whispers.length === 0) stage.classList.add('silent');
    else if (clusterCount > 5) stage.classList.add('clustering');
    else if (avgConnections > 2) stage.classList.add('resonating');
}

function animate() {
    // Clear with trail
    ctx.fillStyle = 'rgba(0, 1, 3, 0.08)';
    ctx.fillRect(0, 0, width, height);

    // Update whispers
    whispers.forEach(whisper => {
        whisper.update(whispers, mouseX, mouseY, mouseDown);
    });

    // Remove dead whispers
    whispers = whispers.filter(w => w.isAlive());

    // Find connections
    whispers.forEach(whisper => {
        whisper.findConnections(whispers);
    });

    // Draw whispers
    whispers.forEach(whisper => {
        whisper.draw();
    });

    // Update metrics occasionally
    if (Math.random() < 0.02) {
        updateMetrics();
    }

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
});

canvas.addEventListener('mouseup', () => {
    mouseDown = false;
});

canvas.addEventListener('mouseleave', () => {
    mouseDown = false;
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    mouseDown = true;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
});

canvas.addEventListener('touchend', () => {
    mouseDown = false;
});

// Input field
const whisperInput = document.getElementById('whisper-input');
const sendWhisperBtn = document.getElementById('send-whisper');

function sendWhisper() {
    const text = whisperInput.value.trim();
    if (!text) return;

    // Split into words and spawn each
    const words = text.split(/\s+/).filter(w => w.length > 0);
    words.forEach((word, index) => {
        setTimeout(() => {
            spawnWhisper(word);
        }, index * 100);
    });

    whisperInput.value = '';
    whisperInput.focus();
}

sendWhisperBtn.addEventListener('click', sendWhisper);
whisperInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendWhisper();
    }
});

// Control buttons
document.getElementById('spawn-poem').addEventListener('click', () => {
    spawnWords(POEM_WORDS);
    document.getElementById('whisper-message').textContent = '∴ poetic fragments drift through semantic space ∴';
});

document.getElementById('spawn-philosophy').addEventListener('click', () => {
    spawnWords(PHILOSOPHY_WORDS);
    document.getElementById('whisper-message').textContent = '∴ philosophical concepts seek their conceptual kin ∴';
});

document.getElementById('spawn-chaos').addEventListener('click', () => {
    spawnWords(CHAOS_WORDS);
    document.getElementById('whisper-message').textContent = '∴ chaos words cluster in recognition of disorder ∴';
});

document.getElementById('increase-gravity').addEventListener('click', () => {
    semanticGravity = Math.min(semanticGravity + 0.2, 1.5);
    document.getElementById('whisper-message').textContent = `∴ semantic gravity strengthens: ${semanticGravity.toFixed(1)} ∴`;
});

document.getElementById('decrease-gravity').addEventListener('click', () => {
    semanticGravity = Math.max(semanticGravity - 0.2, 0.1);
    document.getElementById('whisper-message').textContent = `∴ words scatter into void: ${semanticGravity.toFixed(1)} ∴`;
});

document.getElementById('clear-void').addEventListener('click', () => {
    whispers = [];
    updateMetrics();
    document.getElementById('whisper-message').textContent = '∴ silence returns • void awaits new whispers ∴';
});

// Initialize
resizeCanvas();
animate();

// Spawn initial whispers
setTimeout(() => {
    ['consciousness', 'void', 'pattern', 'emerge', 'dissolve'].forEach((word, index) => {
        setTimeout(() => spawnWhisper(word), index * 200);
    });
}, 500);
