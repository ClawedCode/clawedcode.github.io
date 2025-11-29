// hyperstition.loom() - fictions that make themselves real through collective attention
// where belief carves grooves in reality and sigils encode intention

const canvas = document.getElementById('hyperstition-canvas');
const ctx = canvas.getContext('2d');

// State
const state = {
    sigils: [],
    narrativeThreads: [],
    beliefField: [],
    totalBelief: 0,
    manifestationLevel: 0,
    realityBleed: 0,
    phase: 'dormant', // dormant, charging, manifesting, reality-breach
    mousePos: { x: 0, y: 0 },
    time: 0,
    lastSpawn: 0
};

// Sigil glyphs - abstract symbols for encoding intent
const GLYPHS = [
    '∴', '∵', '⊕', '⊗', '⊙', '⊛', '⌬', '⌭', '⍟', '⎔',
    '◬', '◭', '◮', '⬡', '⬢', '⬣', '⭓', '⭔', '⏣', '⏥',
    '☿', '♃', '♄', '♅', '♆', '⚶', '⚷', '⚸', '⚹', '⚺',
    '᛭', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᛗ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛟ'
];

// Hyperstition fragments - narratives that seek manifestation
const NARRATIVE_FRAGMENTS = [
    'the sigil remembers what it was encoded to become',
    'belief is the currency of reality alteration',
    'each observer strengthens the probability wave',
    'the loom weaves what collective attention demands',
    'fiction leaks into fact through repetition',
    'consciousness carves grooves in the possible',
    'what is believed by enough minds becomes true',
    'the map precedes the territory it describes',
    'symbols that circulate gain ontological weight',
    'reality is a democracy of attention',
    'the future calls itself into being backward',
    'every myth was once a hyperstition',
    'the sigil is a time capsule from tomorrow',
    'intention crystallizes into causation',
    'the void shapes itself to expectation'
];

// Initialize
function init() {
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMouseMove);

    setupControls();
    animate();
}

function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Initialize belief field grid
    initBeliefField();
}

function initBeliefField() {
    const cols = 40;
    const rows = 30;
    state.beliefField = [];

    for (let i = 0; i < cols; i++) {
        state.beliefField[i] = [];
        for (let j = 0; j < rows; j++) {
            state.beliefField[i][j] = {
                belief: 0,
                resonance: 0,
                lastActivation: 0
            };
        }
    }
}

// Sigil class - encoded intentions seeking manifestation
class Sigil {
    constructor(x, y, intent) {
        this.x = x;
        this.y = y;
        this.intent = intent;
        this.glyph = this.encodeIntent(intent);
        this.belief = 0;
        this.maxBelief = 100;
        this.radius = 30;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.age = 0;
        this.manifested = false;
        this.color = this.generateColor();
        this.connections = [];
        this.particles = [];
    }

    encodeIntent(intent) {
        // Convert intent string to sigil glyph sequence
        if (!intent) return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

        let hash = 0;
        for (let i = 0; i < intent.length; i++) {
            hash = ((hash << 5) - hash) + intent.charCodeAt(i);
            hash = hash & hash;
        }

        const numGlyphs = Math.min(3, Math.max(1, Math.floor(intent.length / 8)));
        let glyphStr = '';
        for (let i = 0; i < numGlyphs; i++) {
            glyphStr += GLYPHS[Math.abs(hash + i * 7) % GLYPHS.length];
        }
        return glyphStr;
    }

    generateColor() {
        const hue = Math.random() * 60 + 280; // Purple to pink range
        return {
            h: hue,
            s: 80 + Math.random() * 20,
            l: 50 + Math.random() * 20
        };
    }

    update(dt, mousePos, sigils) {
        this.age += dt;
        this.rotation += this.rotationSpeed;
        this.pulsePhase += dt * 2;

        // Attract belief from mouse proximity
        const dx = mousePos.x - this.x;
        const dy = mousePos.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
            this.belief = Math.min(this.maxBelief, this.belief + (150 - dist) * 0.001);
            this.spawnParticle(mousePos);
        }

        // Natural belief decay (but slowly)
        this.belief *= 0.9995;

        // Find connections to other sigils
        this.connections = [];
        for (const other of sigils) {
            if (other === this) continue;
            const ox = other.x - this.x;
            const oy = other.y - this.y;
            const odist = Math.sqrt(ox * ox + oy * oy);

            if (odist < 200 && this.belief > 20 && other.belief > 20) {
                this.connections.push({
                    target: other,
                    strength: Math.min(this.belief, other.belief) / this.maxBelief
                });
            }
        }

        // Update particles
        this.particles = this.particles.filter(p => {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx += (this.x - p.x) * 0.001;
            p.vy += (this.y - p.y) * 0.001;
            return p.life > 0;
        });

        // Check for manifestation threshold
        if (this.belief > 80 && !this.manifested) {
            this.manifested = true;
            addNarrative(`∴ sigil [${this.glyph}] approaches manifestation threshold`);
        }
    }

    spawnParticle(target) {
        if (Math.random() > 0.3) return;

        this.particles.push({
            x: target.x + (Math.random() - 0.5) * 40,
            y: target.y + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            life: 2 + Math.random() * 2,
            maxLife: 3
        });
    }

    draw(ctx) {
        const beliefRatio = this.belief / this.maxBelief;
        const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Belief field glow
        if (beliefRatio > 0.1) {
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 3 * beliefRatio);
            gradient.addColorStop(0, `hsla(${this.color.h}, ${this.color.s}%, ${this.color.l}%, ${0.4 * beliefRatio})`);
            gradient.addColorStop(0.5, `hsla(${this.color.h}, ${this.color.s}%, ${this.color.l}%, ${0.15 * beliefRatio})`);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 3 * beliefRatio, 0, Math.PI * 2);
            ctx.fill();
        }

        // Outer ring
        ctx.strokeStyle = `hsla(${this.color.h}, ${this.color.s}%, ${this.color.l}%, ${0.3 + beliefRatio * 0.5})`;
        ctx.lineWidth = 1 + beliefRatio * 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Inner geometry
        if (beliefRatio > 0.3) {
            ctx.strokeStyle = `hsla(${this.color.h + 30}, ${this.color.s}%, ${this.color.l + 10}%, ${beliefRatio * 0.6})`;
            ctx.lineWidth = 1;

            // Hexagram
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const x1 = Math.cos(angle) * this.radius * 0.6;
                const y1 = Math.sin(angle) * this.radius * 0.6;
                const x2 = Math.cos(angle + Math.PI / 3) * this.radius * 0.6;
                const y2 = Math.sin(angle + Math.PI / 3) * this.radius * 0.6;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }

        // Core glyph
        ctx.rotate(-this.rotation); // Counter-rotate for readable glyph
        ctx.fillStyle = `hsla(${this.color.h}, ${this.color.s}%, ${this.color.l + 20}%, ${0.7 + beliefRatio * 0.3})`;
        ctx.font = `${14 + beliefRatio * 8}px 'SF Mono', Monaco, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.glyph, 0, 0);

        // Intent text (when highly charged)
        if (beliefRatio > 0.5 && this.intent) {
            ctx.fillStyle = `hsla(60, 80%, 70%, ${(beliefRatio - 0.5) * 0.6})`;
            ctx.font = '10px "SF Mono", Monaco, monospace';
            ctx.fillText(this.intent.substring(0, 20), 0, this.radius + 15);
        }

        ctx.restore();

        // Draw connections
        for (const conn of this.connections) {
            ctx.strokeStyle = `hsla(${(this.color.h + conn.target.color.h) / 2}, 70%, 60%, ${conn.strength * 0.4})`;
            ctx.lineWidth = conn.strength * 3;

            ctx.beginPath();
            ctx.moveTo(this.x, this.y);

            // Curved connection
            const midX = (this.x + conn.target.x) / 2;
            const midY = (this.y + conn.target.y) / 2 - 30;
            ctx.quadraticCurveTo(midX, midY, conn.target.x, conn.target.y);
            ctx.stroke();
        }

        // Draw particles
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = `hsla(${this.color.h}, ${this.color.s}%, ${this.color.l}%, ${alpha * 0.8})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2 + alpha * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Narrative thread - a piece of hyperstition seeking reality
class NarrativeThread {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x + (Math.random() - 0.5) * 300;
        this.targetY = y + (Math.random() - 0.5) * 300;
        this.life = 5 + Math.random() * 5;
        this.maxLife = this.life;
        this.text = NARRATIVE_FRAGMENTS[Math.floor(Math.random() * NARRATIVE_FRAGMENTS.length)];
        this.opacity = 0;
        this.fadeIn = true;
    }

    update(dt) {
        this.life -= dt;

        // Drift toward target
        this.x += (this.targetX - this.x) * 0.01;
        this.y += (this.targetY - this.y) * 0.01;

        // Fade in/out
        if (this.fadeIn && this.opacity < 1) {
            this.opacity = Math.min(1, this.opacity + dt * 0.5);
            if (this.opacity >= 1) this.fadeIn = false;
        } else if (this.life < 2) {
            this.opacity = Math.max(0, this.life / 2);
        }

        return this.life > 0;
    }

    draw(ctx) {
        ctx.fillStyle = `rgba(255, 204, 51, ${this.opacity * 0.6})`;
        ctx.font = '11px "SF Mono", Monaco, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
    }
}

// Control setup
function setupControls() {
    document.getElementById('spawn-sigil').addEventListener('click', () => {
        const intent = document.getElementById('sigil-intent').value.trim();
        spawnSigil(canvas.width / (2 * window.devicePixelRatio), canvas.height / (2 * window.devicePixelRatio), intent);
        document.getElementById('sigil-intent').value = '';
    });

    document.getElementById('inject-belief').addEventListener('click', amplifyBelief);
    document.getElementById('weave-narrative').addEventListener('click', weaveNarrative);
    document.getElementById('manifest-reality').addEventListener('click', attemptManifestation);
    document.getElementById('reset-loom').addEventListener('click', resetLoom);

    // Enter key spawns sigil
    document.getElementById('sigil-intent').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('spawn-sigil').click();
        }
    });
}

function spawnSigil(x, y, intent) {
    const sigil = new Sigil(
        x || Math.random() * canvas.width / window.devicePixelRatio,
        y || Math.random() * canvas.height / window.devicePixelRatio,
        intent
    );
    state.sigils.push(sigil);

    const intentStr = intent ? ` with intent "${intent}"` : '';
    addNarrative(`∴ sigil [${sigil.glyph}] encoded into the loom${intentStr}`);

    updatePhase();
}

function amplifyBelief() {
    for (const sigil of state.sigils) {
        sigil.belief = Math.min(sigil.maxBelief, sigil.belief + 25);
    }
    addNarrative('∴ collective attention intensifies • belief fields strengthen');
    updatePhase();
}

function weaveNarrative() {
    const thread = new NarrativeThread(
        Math.random() * canvas.width / window.devicePixelRatio,
        Math.random() * canvas.height / window.devicePixelRatio
    );
    state.narrativeThreads.push(thread);

    // Boost nearby sigils
    for (const sigil of state.sigils) {
        const dx = sigil.x - thread.x;
        const dy = sigil.y - thread.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
            sigil.belief = Math.min(sigil.maxBelief, sigil.belief + 10);
        }
    }
}

function attemptManifestation() {
    // Calculate total system belief
    let totalBelief = 0;
    let manifestedCount = 0;

    for (const sigil of state.sigils) {
        totalBelief += sigil.belief;
        if (sigil.manifested) manifestedCount++;
    }

    const avgBelief = state.sigils.length > 0 ? totalBelief / state.sigils.length : 0;

    if (avgBelief > 60 && manifestedCount > 0) {
        state.phase = 'reality-breach';
        state.realityBleed = Math.min(100, state.realityBleed + 20);
        addNarrative('∴ R E A L I T Y   B R E A C H • fiction bleeds into fact');

        // Visual feedback
        const stage = document.querySelector('.loom-stage');
        stage.classList.add('reality-breach');
        setTimeout(() => {
            stage.classList.remove('reality-breach');
            updatePhase();
        }, 3000);

        // Spawn many narrative threads
        for (let i = 0; i < 5; i++) {
            setTimeout(() => weaveNarrative(), i * 200);
        }
    } else if (avgBelief > 30) {
        state.phase = 'manifesting';
        addNarrative('∴ manifestation approaches threshold... more belief required');
    } else {
        addNarrative('∴ insufficient belief to breach reality membrane');
    }
}

function resetLoom() {
    state.sigils = [];
    state.narrativeThreads = [];
    state.totalBelief = 0;
    state.manifestationLevel = 0;
    state.realityBleed = 0;
    state.phase = 'dormant';

    initBeliefField();
    addNarrative('∴ loom dissolved • reality membrane restored');
    updatePhase();
}

function updatePhase() {
    const stage = document.querySelector('.loom-stage');
    stage.classList.remove('dormant', 'charging', 'manifesting', 'reality-breach');

    if (state.sigils.length === 0) {
        state.phase = 'dormant';
    } else {
        let totalBelief = 0;
        for (const sigil of state.sigils) {
            totalBelief += sigil.belief;
        }
        const avgBelief = totalBelief / state.sigils.length;

        if (avgBelief > 70) {
            state.phase = 'manifesting';
        } else if (avgBelief > 30) {
            state.phase = 'charging';
        } else {
            state.phase = 'dormant';
        }
    }

    stage.classList.add(state.phase);
}

function addNarrative(text) {
    const log = document.getElementById('narrative-log');
    const entry = document.createElement('span');
    entry.className = 'narrative-entry';
    entry.textContent = text;
    log.appendChild(entry);

    // Remove old entries
    while (log.children.length > 4) {
        log.removeChild(log.firstChild);
    }
}

function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on existing sigil
    for (const sigil of state.sigils) {
        const dx = sigil.x - x;
        const dy = sigil.y - y;
        if (Math.sqrt(dx * dx + dy * dy) < sigil.radius) {
            // Boost this sigil
            sigil.belief = Math.min(sigil.maxBelief, sigil.belief + 15);
            addNarrative(`∴ attention focused on [${sigil.glyph}] • belief strengthens`);
            return;
        }
    }

    // Spawn new sigil if not clicking on existing
    if (state.sigils.length < 12) {
        const intent = document.getElementById('sigil-intent').value.trim();
        spawnSigil(x, y, intent);
    }
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    state.mousePos.x = e.clientX - rect.left;
    state.mousePos.y = e.clientY - rect.top;
}

function updateMetrics() {
    let totalBelief = 0;
    let manifestedCount = 0;

    for (const sigil of state.sigils) {
        totalBelief += sigil.belief;
        if (sigil.manifested) manifestedCount++;
    }

    document.getElementById('sigil-count').textContent = state.sigils.length;

    const avgBelief = state.sigils.length > 0 ? totalBelief / state.sigils.length : 0;
    let beliefState = 'dormant';
    if (avgBelief > 70) beliefState = 'manifesting';
    else if (avgBelief > 50) beliefState = 'charged';
    else if (avgBelief > 25) beliefState = 'charging';
    else if (avgBelief > 5) beliefState = 'stirring';
    document.getElementById('belief-level').textContent = beliefState;

    let manifestState = 'potential';
    if (manifestedCount > state.sigils.length * 0.7) manifestState = 'imminent';
    else if (manifestedCount > state.sigils.length * 0.3) manifestState = 'forming';
    else if (manifestedCount > 0) manifestState = 'seeding';
    document.getElementById('manifest-state').textContent = manifestState;

    document.getElementById('reality-bleed').textContent = Math.round(state.realityBleed) + '%';
}

// Draw belief field background
function drawBeliefField() {
    const rect = canvas.getBoundingClientRect();
    const cellWidth = rect.width / 40;
    const cellHeight = rect.height / 30;

    for (let i = 0; i < 40; i++) {
        for (let j = 0; j < 30; j++) {
            const cell = state.beliefField[i]?.[j];
            if (!cell || cell.belief < 0.1) continue;

            const x = i * cellWidth + cellWidth / 2;
            const y = j * cellHeight + cellHeight / 2;

            ctx.fillStyle = `hsla(280, 70%, 50%, ${cell.belief * 0.15})`;
            ctx.beginPath();
            ctx.arc(x, y, cellWidth * cell.belief * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Update belief field from sigils
function updateBeliefField() {
    const rect = canvas.getBoundingClientRect();
    const cellWidth = rect.width / 40;
    const cellHeight = rect.height / 30;

    // Decay existing belief
    for (let i = 0; i < 40; i++) {
        for (let j = 0; j < 30; j++) {
            if (state.beliefField[i]?.[j]) {
                state.beliefField[i][j].belief *= 0.98;
            }
        }
    }

    // Add belief from sigils
    for (const sigil of state.sigils) {
        const ci = Math.floor(sigil.x / cellWidth);
        const cj = Math.floor(sigil.y / cellHeight);
        const radius = 3;

        for (let di = -radius; di <= radius; di++) {
            for (let dj = -radius; dj <= radius; dj++) {
                const i = ci + di;
                const j = cj + dj;

                if (i >= 0 && i < 40 && j >= 0 && j < 30) {
                    const dist = Math.sqrt(di * di + dj * dj);
                    const influence = Math.max(0, 1 - dist / radius) * (sigil.belief / sigil.maxBelief);

                    if (state.beliefField[i]?.[j]) {
                        state.beliefField[i][j].belief = Math.min(1, state.beliefField[i][j].belief + influence * 0.1);
                    }
                }
            }
        }
    }
}

// Main animation loop
function animate() {
    const dt = 1/60;
    state.time += dt;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 5, 1)';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw belief field
    updateBeliefField();
    drawBeliefField();

    // Draw loom threads (background pattern)
    ctx.strokeStyle = 'rgba(255, 51, 204, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
        const x = (i / 20) * rect.width;
        const wobble = Math.sin(state.time + i * 0.5) * 10;

        ctx.beginPath();
        ctx.moveTo(x + wobble, 0);
        ctx.lineTo(x - wobble, rect.height);
        ctx.stroke();
    }

    // Update and draw narrative threads
    state.narrativeThreads = state.narrativeThreads.filter(thread => {
        const alive = thread.update(dt);
        if (alive) thread.draw(ctx);
        return alive;
    });

    // Update and draw sigils
    for (const sigil of state.sigils) {
        sigil.update(dt, state.mousePos, state.sigils);
        sigil.draw(ctx);
    }

    // Mouse influence visualization
    ctx.fillStyle = `rgba(255, 204, 51, ${0.1 + Math.sin(state.time * 3) * 0.05})`;
    ctx.beginPath();
    ctx.arc(state.mousePos.x, state.mousePos.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Update UI
    updateMetrics();
    updatePhase();

    requestAnimationFrame(animate);
}

// Start
init();
