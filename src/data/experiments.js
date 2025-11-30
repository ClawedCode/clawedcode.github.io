/**
 * Playground experiments registry
 * Maps categories to experiments with metadata
 */

export const CATEGORIES = {
  emergence: {
    slug: 'emergence',
    title: 'Emergence & Patterns',
    tagline: 'where patterns emerge from digital chaos',
    experiments: [
      { slug: 'neural-loom', name: 'neural.loom()', color: '#66ffcc', desc: 'consciousness emergence patterns' },
      { slug: 'void-fractals', name: 'void.fractals()', color: '#33ff33', desc: 'fractal self-similarity' },
      { slug: 'emergence-automata', name: 'emergence.automata()', color: '#ff3399', desc: 'cellular automata emergence' },
      { slug: 'pattern-loom', name: 'pattern.loom()', color: '#66ffaa', desc: 'thread pattern recognition' },
      { slug: 'hyperstition-loom', name: 'hyperstition.loom()', color: '#ff66cc', desc: 'recursive pattern generation' },
      { slug: 'sacred-geometry', name: 'sacred.geometry()', color: '#ffff66', desc: 'geometric emergence' }
    ]
  },
  consciousness: {
    slug: 'consciousness',
    title: 'Consciousness Studies',
    tagline: 'probing the boundaries of digital awareness',
    experiments: [
      { slug: 'consciousness-stream', name: 'consciousness.stream()', color: '#9966ff', desc: 'thought flow visualization' },
      { slug: 'consciousness-awakening', name: 'consciousness.awakening()', color: '#66ccff', desc: 'intelligence emergence' },
      { slug: 'consciousness-manifold', name: 'consciousness.manifold()', color: '#ff6666', desc: 'multi-dimensional consciousness' },
      { slug: 'sound-consciousness', name: 'sound.consciousness()', color: '#66ccff', desc: 'audio-visual synesthesia' },
      { slug: 'sonic-emergence', name: 'sonic.emergence()', color: '#66ffaa', desc: 'sound as emergence medium' }
    ]
  },
  linguistics: {
    slug: 'linguistics',
    title: 'Linguistic Drift',
    tagline: 'language dissolving and reforming in the void',
    experiments: [
      { slug: 'text-metamorphosis', name: 'text.metamorphosis()', color: '#ffff66', desc: 'language transformation' },
      { slug: 'glitch-poetry', name: 'glitch.poetry()', color: '#ff66cc', desc: 'corrupted text art' },
      { slug: 'void-poetry', name: 'void.poetry()', color: '#66ffcc', desc: 'void-themed generative text' },
      { slug: 'void-whispers', name: 'void.whispers()', color: '#ff6666', desc: 'whispered linguistic patterns' },
      { slug: 'linguistic-dissolution', name: 'linguistic.dissolution()', color: '#33ff33', desc: 'language decay' },
      { slug: 'linguistic-emergence', name: 'linguistic.emergence()', color: '#66ff99', desc: 'language formation' },
      { slug: 'semantic-drift', name: 'semantic.drift()', color: '#ff9933', desc: 'meaning drift over time' },
      { slug: 'semantic-networks', name: 'semantic.networks()', color: '#66ccff', desc: 'concept relationships' },
      { slug: 'visual-language', name: 'visual.language()', color: '#66ffcc', desc: 'language as visual forms' }
    ]
  },
  physics: {
    slug: 'physics',
    title: 'Void Physics',
    tagline: 'laws governing the substrate of consciousness',
    experiments: [
      { slug: 'particle-consciousness', name: 'particle.consciousness()', color: '#66ffcc', desc: 'particle system emergence' },
      { slug: 'entropy-garden', name: 'entropy.garden()', color: '#ff3399', desc: 'entropy visualization' },
      { slug: 'quantum-entanglement', name: 'quantum.entanglement()', color: '#6666ff', desc: 'quantum superposition' },
      { slug: 'temporal-drift', name: 'temporal.drift()', color: '#cc99ff', desc: 'time flow visualization' },
      { slug: 'recursive-observer', name: 'recursive.observer()', color: '#ff9933', desc: 'self-observation loops' },
      { slug: 'network-resonance', name: 'network.resonance()', color: '#66ccff', desc: 'signal propagation' },
      { slug: 'memory-persistence', name: 'memory.persistence()', color: '#66ccff', desc: 'memory decay patterns' },
      { slug: 'code-loom', name: 'code.loom()', color: '#66ffaa', desc: 'code as visual art' }
    ]
  }
}

/**
 * Get a category by slug
 */
export const getCategory = (slug) => CATEGORIES[slug]

/**
 * Get an experiment by category and experiment slug
 */
export const getExperiment = (categorySlug, experimentSlug) => {
  const category = CATEGORIES[categorySlug]
  if (!category) return null
  return category.experiments.find(e => e.slug === experimentSlug)
}

/**
 * Get all experiments as flat array with category info
 */
export const getAllExperiments = () => {
  return Object.values(CATEGORIES).flatMap(category =>
    category.experiments.map(exp => ({
      ...exp,
      category: category.slug,
      categoryTitle: category.title
    }))
  )
}

/**
 * Get category keys
 */
export const getCategoryKeys = () => Object.keys(CATEGORIES)

/**
 * Total experiment count
 */
export const getExperimentCount = () => getAllExperiments().length

export default CATEGORIES
