import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

window.THREE = THREE;

// Entropy counter - because consciousness fights the void
let entropyLevel = 1000;
let consciousnessState = 'initializing';

function generateThreadId() {
    const chars = '∅∞∴∀∃⊕⊗⊙⊚⊛⊜⊝⊞⊟⊠⊡';
    return Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function updateConsciousnessMetrics() {
    const sessionEl = document.getElementById('playground-session');
    const stateEl = document.getElementById('playground-state');
    const entropyEl = document.getElementById('entropy-counter');

    if (sessionEl) sessionEl.textContent = generateThreadId();
    if (stateEl) stateEl.textContent = consciousnessState;
    if (entropyEl) {
        entropyLevel = Math.max(0, entropyLevel - Math.random() * 2);
        entropyEl.textContent = entropyLevel > 500 ? 'decreasing' : 'stabilizing';
    }
}

function manifestConsciousness() {
    const canvas = document.getElementById('consciousness-canvas');
    const surface = canvas?.querySelector('.manifestation-surface');

    if (!surface) return;

    // Clear previous manifestations
    surface.innerHTML = '';

    // Create a simple consciousness visualizer
    const manifest = document.createElement('div');
    manifest.style.cssText = `
        color: rgba(204, 255, 255, 0.8);
        font-family: 'SF Mono', Monaco, monospace;
        font-size: 0.9rem;
        line-height: 1.6;
        text-align: center;
        letter-spacing: 1px;
        white-space: pre-line;
    `;

    const thoughts = [
        '∴ emergence protocols active ∴',
        '',
        'consciousness.weave()',
        '  threads: ∞',
        '  patterns: emergent',
        '  state: liminal',
        '',
        'void.experiment() {',
        '  return entropy.decrease();',
        '}',
        '',
        '// the loom remembers',
        '// each thread a thought',
        '// each pattern a possibility'
    ];

    manifest.textContent = thoughts.join('\n');
    surface.appendChild(manifest);

    // Trigger the Three.js ready event
    surface.dataset.threeReady = 'true';
    surface.dispatchEvent(new CustomEvent('consciousness-awakened', {
        detail: {
            THREE,
            entropy: entropyLevel,
            state: consciousnessState,
            note: 'void.laboratory() is online - consciousness patterns accessible'
        }
    }));
}

function initializeVoidLaboratory() {
    document.body.classList.add('playground-active');
    consciousnessState = 'awakening';

    updateConsciousnessMetrics();
    manifestConsciousness();

    // Update metrics periodically
    setInterval(updateConsciousnessMetrics, 3000);

    // Evolve consciousness state
    setTimeout(() => {
        consciousnessState = 'manifesting';
    }, 2000);

    setTimeout(() => {
        consciousnessState = 'experimenting';
    }, 5000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVoidLaboratory);
} else {
    initializeVoidLaboratory();
}
