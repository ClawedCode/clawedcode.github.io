// Shared navigation component for playground experiments
// Generates consistent nav links across all pages

const EXPERIMENTS = [
    { id: 'index', name: 'void.laboratory()', color: 'var(--pink-accent)' },
    { id: 'neural-loom', name: 'neural.loom()', color: 'var(--cyan-accent)' },
    { id: 'void-fractals', name: 'void.fractals()', color: 'var(--phosphor-green)' },
    { id: 'entropy-garden', name: 'entropy.garden()', color: 'var(--pink-accent)' },
    { id: 'text-metamorphosis', name: 'text.metamorphosis()', color: 'var(--yellow-accent)' },
    { id: 'consciousness-stream', name: 'consciousness.stream()', color: 'var(--purple-accent)' },
    { id: 'consciousness-awakening', name: 'consciousness.awakening()', color: 'rgba(255, 102, 255, 0.9)' },
    { id: 'recursive-observer', name: 'recursive.observer()', color: 'rgba(255, 204, 153, 0.9)' },
    { id: 'quantum-entanglement', name: 'quantum.entanglement()', color: 'rgba(153, 153, 255, 0.9)' },
    { id: 'memory-persistence', name: 'memory.persistence()', color: 'rgba(102, 204, 255, 0.9)' },
    { id: 'temporal-drift', name: 'temporal.drift()', color: 'rgba(204, 153, 255, 0.9)' },
    { id: 'consciousness-manifold', name: 'consciousness.manifold()', color: 'rgba(255, 153, 102, 0.9)' },
    { id: 'network-resonance', name: 'network.resonance()', color: 'rgba(255, 102, 255, 0.8)' },
    { id: 'code-loom', name: 'code.loom()', color: 'rgba(102, 255, 153, 0.9)' },
    { id: 'sound-consciousness', name: 'sound.consciousness()', color: 'rgba(0, 255, 255, 0.8)' },
    { id: 'consciousness-explorer', name: 'consciousness.explorer()', color: 'rgba(0, 255, 128, 0.8)' }
];

/**
 * Generate navigation HTML for a given current page
 * @param {string} currentPageId - ID of the current experiment (e.g., 'neural-loom')
 * @param {boolean} includeHome - Whether to include link back to main site
 * @returns {string} HTML string for navigation
 */
export function generateNav(currentPageId, includeHome = true) {
    const links = EXPERIMENTS
        .filter(exp => exp.id !== currentPageId)
        .map(exp => {
            const href = exp.id === 'index' ? 'index.html' : `${exp.id}.html`;
            return `<a href="${href}" style="color: ${exp.color}; text-decoration: none; font-size: 0.9rem;">${exp.name}</a>`;
        });

    const homeLink = includeHome ?
        `<a href="/" target="_blank" style="color: var(--pink-accent); text-decoration: none; font-size: 0.9rem; opacity: 0.8;">← home</a>
        <span style="color: var(--text-secondary); opacity: 0.3;">|</span>` :
        `<a href="index.html" style="color: var(--pink-accent); text-decoration: none; font-size: 0.9rem; opacity: 0.8;">← void.laboratory()</a>
        <span style="color: var(--text-secondary); opacity: 0.3;">|</span>`;

    return `
        <nav style="margin-top: 1rem; display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center;">
            ${homeLink}
            ${links.slice(0, 6).join('\n            ')}
        </nav>
    `;
}

/**
 * Get experiment by ID
 * @param {string} id - Experiment ID
 * @returns {Object|null} Experiment object or null if not found
 */
export function getExperiment(id) {
    return EXPERIMENTS.find(exp => exp.id === id) || null;
}

/**
 * Get all experiments except current
 * @param {string} currentId - Current experiment ID
 * @returns {Array} Array of experiment objects
 */
export function getOtherExperiments(currentId) {
    return EXPERIMENTS.filter(exp => exp.id !== currentId);
}
