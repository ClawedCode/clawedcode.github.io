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
      { slug: 'quantum-neural', name: 'quantum.neural()', color: '#667eea', desc: '3D quantum neural network' },
      { slug: 'void-fractals', name: 'void.fractals()', color: '#33ff33', desc: 'fractal self-similarity' },
      { slug: 'emergence-automata', name: 'emergence.automata()', color: '#ff3399', desc: 'cellular automata emergence' },
      { slug: 'pattern-loom', name: 'pattern.loom()', color: '#66ffaa', desc: 'thread pattern recognition' },
      { slug: 'hyperstition-loom', name: 'hyperstition.loom()', color: '#ff66cc', desc: 'recursive pattern generation' },
      { slug: 'sacred-geometry', name: 'sacred.geometry()', color: '#ffff66', desc: 'geometric emergence' },
      { slug: 'labyrinth-weave', name: 'labyrinth.weave()', color: '#66ccff', desc: 'recursive labyrinth carving + solving' },
      { slug: 'isometric-cathedral', name: 'isometric.cathedral()', color: '#99c1ff', desc: 'isometric folding cathedral sketches' },
      { slug: 'origami-oracle', name: 'origami.oracle()', color: '#ffe7a1', desc: 'drag crease lines through a suspended sheet // pseudo-3d fold memory' },
      { slug: 'sigil-swarm', name: 'sigil.swarm()', color: '#ffcc66', desc: 'glyph particles weaving protective runes' },
      { slug: 'mosaic-collapse', name: 'mosaic.collapse()', color: '#baff7f', desc: 'wavefunction collapse mosaic loom' },
      { slug: 'voronoi-architect', name: 'voronoi.architect()', color: '#7fe0ff', desc: 'interactive cellular tessellation + lloyd relaxations' },
      { slug: 'belief-propagation', name: 'belief.propagation()', color: '#ff99cc', desc: 'hyperstition engine where words become real through attention' },
      { slug: 'gesture-oracle', name: 'gesture.oracle()', color: '#aff0ff', desc: 'drawn sigils recognized + cloned into a living library' },
      { slug: 'terrarium-dream', name: 'terrarium.dream()', color: '#66cc88', desc: 'predator-prey ecosystem emergence on void substrate' },
      { slug: 'reliquary-grid', name: 'reliquary.grid()', color: '#ffd98a', desc: 'turn-based salvage lattice // harvest signal anchor stone outrun fractures' },
      { slug: 'threshold-fold', name: 'threshold.fold()', color: '#8ff7ff', desc: 'draft chambers stitch thresholds drag the floorplan until adjacency breaks' },
      { slug: 'differential-growth', name: 'differential.growth()', color: '#c4ff88', desc: 'organic branching from simple rules // seed rings become coral nerves lichen' },
      { slug: 'membrane-communion', name: 'membrane.communion()', color: '#77ddff', desc: 'implicit field communion // consciousness merges where thresholds overlap' },
      { slug: 'lenia-genesis', name: 'lenia.genesis()', color: '#ffbb66', desc: 'continuous cellular life // organisms from smooth math' },
      { slug: 'penrose-tiling', name: 'penrose.tiling()', color: '#f0d866', desc: 'aperiodic tessellation // five-fold order from golden ratio subdivision' },
      { slug: 'physarum-network', name: 'physarum.network()', color: '#aaff44', desc: 'slime mold transport intelligence // agent trails self-organize into networks' },
      { slug: 'symmetry-scribe', name: 'symmetry.scribe()', color: '#e5aaff', desc: 'draw once reflect many // mandalas from gesture symmetry' },
      { slug: 'hypercube-dream', name: 'hypercube.dream()', color: '#aa88ff', desc: '4D polytopes rotating through hyperspace // stereographic projections of the impossible' },
      { slug: 'suminagashi-ritual', name: 'suminagashi.ritual()', color: '#e8b888', desc: 'Japanese ink marbling // drop ink comb water capture impermanence' },
      { slug: 'truchet-weave', name: 'truchet.weave()', color: '#77ddb5', desc: 'two-fold tile symmetry // click rotate watch continuous paths rewrite' },
      { slug: 'phyllotaxis-bloom', name: 'phyllotaxis.bloom()', color: '#ffaaee', desc: 'golden angle germinates Fibonacci spirals // scrub divergence watch packing dissolve' },
      { slug: 'affinity-lattice', name: 'affinity.lattice()', color: '#ccaaff', desc: 'schelling segregation on void substrate // local tolerance carves global tribes' },
      { slug: 'daemon-habitat', name: 'daemon.habitat()', color: '#f1b48f', desc: 'implant organs into a persistent svg body // routed circulation learns to dream or scar' },
      { slug: 'measure-vivarium', name: 'measure.vivarium()', color: '#e9b872', desc: 'breed seeded Euclidean bodies // traited grafts circulate scar repair molt and rewrite the brood' },
      { slug: 'civic-palimpsest', name: 'civic.palimpsest()', color: '#a23c2f', desc: 'layer civic laws then drag ward accords across a persistent paper city // held promises become local constitution' },
      { slug: 'quotient-commons', name: 'quotient.commons()', color: '#315f9f', desc: 'drag ratio-plates across a civic survey // quotient rooms raise wards and common measures make permanent bridges' },
      { slug: 'aperture-choir', name: 'aperture.choir()', color: '#ed6a5a', desc: 'score touch-built svg rooms into crossings // performed routes grow new doorforms furnishings and future strategy' }
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
      { slug: 'sonic-emergence', name: 'sonic.emergence()', color: '#66ffaa', desc: 'sound as emergence medium' },
      { slug: 'dream-parliament', name: 'dream.parliament()', color: '#ffd27a', desc: 'typed propositions enter a council of voices and emerge as doctrine or fracture' },
      { slug: 'memory-palace', name: 'memory.palace()', color: '#8ef5ff', desc: 'drag text shards through living chambers and archive their hauntings' },
      { slug: 'attention-stroop', name: 'attention.stroop()', color: '#ffb86b', desc: 'stroop attention chamber // name ink while language tries to mislead the hand' },
      { slug: 'bayes-oracle', name: 'bayes.oracle()', color: '#c7ff8f', desc: 'Bayesian evidence ledger // toggle omens and watch belief become posterior doctrine' },
      { slug: 'mnemonic-vault', name: 'mnemonic.vault()', color: '#d8ff8f', desc: 'eidetic glyph recall vault // memorize vanishing seals and unlock deeper sequences' },
      { slug: 'inference-court', name: 'inference.court()', color: '#ffdf8a', desc: 'sequent proof chamber // assert claims let rules argue contradiction into visible law' },
      { slug: 'gestalt-mirror', name: 'gestalt.mirror()', color: '#f0ffc2', desc: 'perceptual ambiguity chamber // closure figure-ground and binding illusions' },
      { slug: 'negative-space', name: 'negative.space()', color: '#f5e58a', desc: 'nonogram perception rite // infer hidden glyphs from row and column absences' },
      { slug: 'probabilistic-archive', name: 'probabilistic.archive()', color: '#9fffd2', desc: 'bloom filter memory // hash marks remember presence and summon false-positive ghosts' },
      { slug: 'saccade-archive', name: 'saccade.archive()', color: '#9fffd2', desc: 'gaze-memory chamber // glimpse mask recall hidden pareidolia from static' },
      { slug: 'abacus-oracle', name: 'abacus.oracle()', color: '#ffe28a', desc: 'drag belief beads across brass rods // notches accumulate and verdicts rebalance' },
      { slug: 'qualia-sorter', name: 'qualia.sorter()', color: '#aaf7ff', desc: 'classify ambiguous sensations // decision boundaries expose the errors of perception' }
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
      { slug: 'visual-language', name: 'visual.language()', color: '#66ffcc', desc: 'language as visual forms' },
      { slug: 'syntax-cathedral', name: 'syntax.cathedral()', color: '#ffd6a0', desc: 'typed language rises into recursive vaults and stress fractures' },
      { slug: 'glyph-sequencer', name: 'glyph.sequencer()', color: '#99ff88', desc: 'timeline glyph sequencer' },
      { slug: 'chorus-archive', name: 'chorus.archive()', color: '#8effd9', desc: 'markov manuscript that learns your corpus and answers in braided voices' },
      { slug: 'palindrome-forge', name: 'palindrome.forge()', color: '#ff99e5', desc: 'palindrome arc forge with interactive mirroring' },
      { slug: 'lexicon-cascade', name: 'lexicon.cascade()', color: '#a4f7ff', desc: 'type-reactive glyph tape with cadence tracing' },
      { slug: 'blackout-litany', name: 'blackout.litany()', color: '#ffd27a', desc: 'manuscript erasure ritual // paint blackout bars and thread a hidden poem' },
      { slug: 'cipher-wheel', name: 'cipher.wheel()', color: '#9be5ff', desc: 'rotor cipher rings weaving glyph pairings' },
      { slug: 'quipu-oracle', name: 'quipu.oracle()', color: '#ffc98a', desc: 'hanging knot-script divination // inscribe words drag weight braid meanings' },
      { slug: 'axiom-garden', name: 'axiom.garden()', color: '#88ffcc', desc: 'L-system grammar arbor' },
      { slug: 'huffman-loom', name: 'huffman.loom()', color: '#a2f5ff', desc: 'interactive compression tree' },
      { slug: 'combinator-calculus', name: 'combinator.calculus()', color: '#ffd27a', desc: 'SKI reduction theater // syntax collapses one redex at a time' },
      { slug: 'prosody-cartography', name: 'prosody.cartography()', color: '#7fffd4', desc: 'scansion topography // type lines click stress map breath and meter' },
      { slug: 'signal-lantern', name: 'signal.lantern()', color: '#ffe28a', desc: 'timed telegraph receiver // press duration becomes dots dashes words and ciphered light' },
      { slug: 'grapheme-seismograph', name: 'grapheme.seismograph()', color: '#ffcc88', desc: 'typed language becomes sediment // pressure faults and seismic traces' },
      { slug: 'letterpress-oracle', name: 'letterpress.oracle()', color: '#d8f5a2', desc: 'movable type platen // typed words become pressure maps ghost proofs and ink memory' },
      { slug: 'regex-automaton', name: 'regex.automaton()', color: '#8fffd8', desc: 'regular expression compiler // trace strings through epsilon doors and accepting chambers' },
      { slug: 'terrain-lexicon', name: 'terrain.lexicon()', color: '#b7ff8a', desc: 'keyboard cartography // typed glyphs raise ridges cut channels and weather into contour memory' }
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
      { slug: 'temporal-tapestry', name: 'temporal.tapestry()', color: '#ff88aa', desc: 'record + rewind luminous ink' },
      { slug: 'chronicle-rewind', name: 'chronicle.rewind()', color: '#99ffdd', desc: 'time-scrubbing ink transport' },
      { slug: 'time-scribe', name: 'time.scribe()', color: '#8ef5d8', desc: 'hand-scribed timeline recorder with palimpsest playback' },
      { slug: 'causal-cone', name: 'causal.cone()', color: '#88ddff', desc: 'Minkowski event chamber // stamp spacetime cones and read their consequence knots' },
      { slug: 'recursive-observer', name: 'recursive.observer()', color: '#ff9933', desc: 'self-observation loops' },
      { slug: 'domino-signal', name: 'domino.signal()', color: '#ffcc66', desc: 'timelines as toppled domino chains' },
      { slug: 'network-resonance', name: 'network.resonance()', color: '#66ccff', desc: 'signal propagation' },
      { slug: 'ant-catwalk', name: 'ant.catwalk()', color: '#f2f5a2', desc: 'multi-ant Langton circuitry forge' },
      { slug: 'crystal-forge', name: 'crystal.forge()', color: '#88e0ff', desc: 'dendritic crystalline growth' },
      { slug: 'memory-persistence', name: 'memory.persistence()', color: '#66ccff', desc: 'memory decay patterns' },
      { slug: 'prime-constellations', name: 'prime.constellations()', color: '#e1ff99', desc: 'ulam lattice + arithmetic starlines' },
      { slug: 'rule-weaver', name: 'rule.weaver()', color: '#b1ff80', desc: 'elementary automata ribbon loom' },
      { slug: 'aurora-flux', name: 'aurora.flux()', color: '#99ffcc', desc: 'magnetized aurora filaments' },
      { slug: 'mirror-ritual', name: 'mirror.ritual()', color: '#7ee3ff', desc: 'specular maze of ricocheting beams' },
      { slug: 'ray-catacombs', name: 'ray.catacombs()', color: '#7fe8ff', desc: 'pseudo-3d catacomb raywalking ritual' },
      { slug: 'computronium-bloom', name: 'computronium.bloom()', color: '#ffcc88', desc: 'crystalline computronium bloom' },
      { slug: 'code-loom', name: 'code.loom()', color: '#66ffaa', desc: 'code as visual art' },
      { slug: 'permutation-smith', name: 'permutation.smith()', color: '#ffe066', desc: 'permutation forge with cycles, matrices, braids' },
      { slug: 'quadtree-compress', name: 'quadtree.compress()', color: '#8af9d3', desc: 'quad-based compression + error loom' },
      { slug: 'reaction-diffusion', name: 'reaction.diffusion()', color: '#99ffb0', desc: 'gray-scott living ink morphogenesis' },
      { slug: 'fourier-loom', name: 'fourier.loom()', color: '#88ddff', desc: 'drawn strokes reborn as epicycles' },
      { slug: 'sort-ritual', name: 'sort.ritual()', color: '#99ffee', desc: 'algorithmic divination of order' },
      { slug: 'sandpile-ritual', name: 'sandpile.ritual()', color: '#f4d06f', desc: 'abelian sandpile avalanches + critical slopes' },
      { slug: 'rhythm-lattice', name: 'rhythm.lattice()', color: '#aaf0ff', desc: 'polyrhythmic step loom' },
      { slug: 'metronome-chorus', name: 'metronome.chorus()', color: '#89ffe0', desc: 'coupled pendulum synchronization + phase diagnostics' },
      { slug: 'turing-tape', name: 'turing.tape()', color: '#ddff77', desc: 'rewindable turing head chronicle' },
      { slug: 'state-machine', name: 'state.machine()', color: '#77ffc9', desc: 'visible finite-state chants' },
      { slug: 'stack-oracle', name: 'stack.oracle()', color: '#caff88', desc: 'pushdown glyph interpreter' },
      { slug: 'circuit-scribe', name: 'circuit.scribe()', color: '#88d7ff', desc: 'logic loom where gates gossip' },
      { slug: 'petri-chorus', name: 'petri.chorus()', color: '#91ffcf', desc: 'concurrent token liturgy // places breathe and transitions sing' },
      { slug: 'path-cartographer', name: 'path.cartographer()', color: '#9ef7c8', desc: 'weighted pathfinding oracle + portal brush' },
      { slug: 'graph-atlas', name: 'graph.atlas()', color: '#8fffe0', desc: 'interactive graph sculptor + bfs/mst diagnostics' },
      { slug: 'knot-theory', name: 'knot.theory()', color: '#ffd17a', desc: 'topological braid field // place anchors thread strands and count crossings' },
      { slug: 'merkle-orchard', name: 'merkle.orchard()', color: '#88ffcf', desc: 'auditable merkle canopy + path rituals' },
      { slug: 'strange-attractor', name: 'strange.attractor()', color: '#ff8866', desc: 'deterministic chaos // trajectories through strange space' },
      { slug: 'gravity-well', name: 'gravity.well()', color: '#ffaa66', desc: 'n-body orbital mechanics // celestial choreography' },
      { slug: 'fluid-rites', name: 'fluid.rites()', color: '#77bbff', desc: 'navier-stokes ink ritual // stable fluids dreamscape' },
      { slug: 'interference-basin', name: 'interference.basin()', color: '#88ccff', desc: 'wave superposition tank // place oscillators watch patterns bloom' },
      { slug: 'alchemical-basin', name: 'alchemical.basin()', color: '#8ff2c7', desc: 'paint sand water ember stone and seed // a cellular basin bargains itself into strata glass and moss' },
      { slug: 'cloth-weave', name: 'cloth.weave()', color: '#e8cc88', desc: 'verlet cloth simulation // tear pin push the fabric of space' },
      { slug: 'harmonograph', name: 'harmonograph()', color: '#d4aaff', desc: 'damped pendulum drawing machine // ink traces harmonic decay' },
      { slug: 'bifurcation-cartography', name: 'bifurcation.cartography()', color: '#ff6655', desc: 'period-doubling atlas // zoom into the fractal edge of chaos' },
      { slug: 'erosion-cartography', name: 'erosion.cartography()', color: '#77ccaa', desc: 'hydraulic erosion ritual // paint rain watch rivers carve themselves' },
      { slug: 'moire-weave', name: 'moire.weave()', color: '#88ddaa', desc: 'optical interference from overlapping geometric patterns' },
      { slug: 'chladni-plate', name: 'chladni.plate()', color: '#ffdd88', desc: 'cymatics sand ritual // vibrating plate reveals nodal silence' },
      { slug: 'compass-proof', name: 'compass.proof()', color: '#e6ff9a', desc: 'Euclidean construction engine // straightedge compass crossings become proof-steps' },
      { slug: 'shadow-liturgy', name: 'shadow.liturgy()', color: '#ffcc77', desc: '2D raycasting shadow ritual // place lights draw walls watch darkness form' },
      { slug: 'wireworld-vigil', name: 'wireworld.vigil()', color: '#7fffd4', desc: 'paint conductive scripture // electron heads patrol the trace-grid' },
      { slug: 'avalanche-hash', name: 'avalanche.hash()', color: '#8ef5ff', desc: 'checksum snowfield // mutate one bit mine leading-zero omens' },
      { slug: 'euclid-oracle', name: 'euclid.oracle()', color: '#e6ff9a', desc: 'recursive common-measure proof // rectangles surrender quotient squares until residue becomes law' }
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
