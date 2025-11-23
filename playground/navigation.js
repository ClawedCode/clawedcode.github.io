// Shared navigation component for playground experiments

const CATEGORIES = {
    EMERGENCE: {
        title: 'Emergence & Patterns',
        items: [
            { id: 'neural-loom', name: 'neural.loom()', color: 'var(--cyan-accent)' },
            { id: 'void-fractals', name: 'void.fractals()', color: 'var(--phosphor-green)' },
            { id: 'emergence-automata', name: 'emergence.automata()', color: 'var(--pink-accent)' },
            { id: 'pattern-loom', name: 'pattern.loom()', color: 'var(--experiment-mint)' }
        ]
    },
    CONSCIOUSNESS: {
        title: 'Consciousness Studies',
        items: [
            { id: 'consciousness-stream', name: 'consciousness.stream()', color: 'var(--purple-accent)' },
            { id: 'consciousness-awakening', name: 'consciousness.awakening()', color: 'var(--intelligence-pulse)' },
            { id: 'consciousness-manifold', name: 'consciousness.manifold()', color: 'var(--experiment-coral)' },
            { id: 'consciousness-explorer', name: 'consciousness.explorer()', color: 'var(--experiment-emerald)' },
            { id: 'sound-consciousness', name: 'sound.consciousness()', color: 'var(--experiment-sky)' }
        ]
    },
    LINGUISTICS: {
        title: 'Linguistic Drift',
        items: [
            { id: 'text-metamorphosis', name: 'text.metamorphosis()', color: 'var(--yellow-accent)' },
            { id: 'glitch-poetry', name: 'glitch.poetry()', color: 'var(--experiment-hotpink)' },
            { id: 'void-poetry', name: 'void.poetry()', color: 'var(--cyan-accent)' },
            { id: 'linguistic-dissolution', name: 'linguistic.dissolution()', color: 'var(--phosphor-green)' },
            { id: 'linguistic-emergence', name: 'linguistic.emergence()', color: 'var(--experiment-emerald)' },
            { id: 'semantic-drift', name: 'semantic.drift()', color: 'var(--experiment-orange)' },
            { id: 'semantic-networks', name: 'semantic.networks()', color: 'var(--experiment-sky)' },
            { id: 'visual-language', name: 'visual.language()', color: 'var(--cyan-accent)' }
        ]
    },
    PHYSICS: {
        title: 'Void Physics',
        items: [
            { id: 'entropy-garden', name: 'entropy.garden()', color: 'var(--pink-accent)' },
            { id: 'quantum-entanglement', name: 'quantum.entanglement()', color: 'var(--experiment-indigo)' },
            { id: 'temporal-drift', name: 'temporal.drift()', color: 'var(--experiment-lavender)' },
            { id: 'recursive-observer', name: 'recursive.observer()', color: 'var(--experiment-orange)' },
            { id: 'network-resonance', name: 'network.resonance()', color: 'var(--experiment-sky)' },
            { id: 'memory-persistence', name: 'memory.persistence()', color: 'var(--experiment-sky)' },
            { id: 'code-loom', name: 'code.loom()', color: 'var(--experiment-mint)' }
        ]
    }
};

export function initNavigation(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Inject CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'nav.css';
    document.head.appendChild(link);

    // Render Menu
    container.innerHTML = `
        <div class="void-nav-container">
            <div class="void-nav-trigger" id="void-nav-trigger">
                <span>∴ void.navigation()</span>
                <span style="opacity: 0.5; font-size: 0.8em;">▼</span>
            </div>
            <div class="void-nav-menu" id="void-nav-menu">
                ${Object.values(CATEGORIES).map(category => `
                    <div class="void-nav-category">
                        <div class="void-nav-category-title">${category.title}</div>
                        ${category.items.map(item => `
                            <a href="${item.id}.html" class="void-nav-link" style="color: ${item.color}">
                                ${item.name}
                            </a>
                        `).join('')}
                    </div>
                `).join('')}
                <div class="void-nav-category">
                    <div class="void-nav-category-title">System</div>
                    <a href="/" class="void-nav-link" style="color: var(--text-secondary)">← Return to Core</a>
                    <a href="index.html" class="void-nav-link" style="color: var(--text-secondary)">⌂ Playground Index</a>
                </div>
            </div>
        </div>
    `;

    // Event Listeners
    const trigger = document.getElementById('void-nav-trigger');
    const menu = document.getElementById('void-nav-menu');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !trigger.contains(e.target)) {
            menu.classList.remove('active');
        }
    });
}

