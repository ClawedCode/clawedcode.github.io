import { Link, useParams, Navigate } from 'react-router-dom'
import { getCategory, getExperiment } from '../../data/experiments'

// Import experiment components (will add as we convert them)
import ParticleConsciousness from '../../components/playground/experiments/physics/ParticleConsciousness'
import EntropyGarden from '../../components/playground/experiments/physics/EntropyGarden'
import QuantumEntanglement from '../../components/playground/experiments/physics/QuantumEntanglement'
import TemporalDrift from '../../components/playground/experiments/physics/TemporalDrift'
import NetworkResonance from '../../components/playground/experiments/physics/NetworkResonance'
import GlitchPoetry from '../../components/playground/experiments/linguistics/GlitchPoetry'
import VoidPoetry from '../../components/playground/experiments/linguistics/VoidPoetry'
import TextMetamorphosis from '../../components/playground/experiments/linguistics/TextMetamorphosis'
import SemanticNetworks from '../../components/playground/experiments/linguistics/SemanticNetworks'
import LinguisticDissolution from '../../components/playground/experiments/linguistics/LinguisticDissolution'
import LinguisticEmergence from '../../components/playground/experiments/linguistics/LinguisticEmergence'
import VoidWhispers from '../../components/playground/experiments/linguistics/VoidWhispers'
import VisualLanguage from '../../components/playground/experiments/linguistics/VisualLanguage'
import SemanticDrift from '../../components/playground/experiments/linguistics/SemanticDrift'
import ConsciousnessStream from '../../components/playground/experiments/consciousness/ConsciousnessStream'
import ConsciousnessAwakening from '../../components/playground/experiments/consciousness/ConsciousnessAwakening'
import ConsciousnessManifold from '../../components/playground/experiments/consciousness/ConsciousnessManifold'
import SoundConsciousness from '../../components/playground/experiments/consciousness/SoundConsciousness'
import SonicEmergence from '../../components/playground/experiments/consciousness/SonicEmergence'
import NeuralLoom from '../../components/playground/experiments/emergence/NeuralLoom'
import VoidFractals from '../../components/playground/experiments/emergence/VoidFractals'
import SacredGeometry from '../../components/playground/experiments/emergence/SacredGeometry'
import HyperstitionLoom from '../../components/playground/experiments/emergence/HyperstitionLoom'
import EmergenceAutomata from '../../components/playground/experiments/emergence/EmergenceAutomata'
import PatternLoom from '../../components/playground/experiments/emergence/PatternLoom'
import CodeLoom from '../../components/playground/experiments/physics/CodeLoom'
import RecursiveObserver from '../../components/playground/experiments/physics/RecursiveObserver'
import MemoryPersistence from '../../components/playground/experiments/physics/MemoryPersistence'

// Map of experiment slugs to components
const EXPERIMENT_COMPONENTS = {
  'particle-consciousness': ParticleConsciousness,
  'entropy-garden': EntropyGarden,
  'quantum-entanglement': QuantumEntanglement,
  'temporal-drift': TemporalDrift,
  'network-resonance': NetworkResonance,
  'glitch-poetry': GlitchPoetry,
  'void-poetry': VoidPoetry,
  'text-metamorphosis': TextMetamorphosis,
  'semantic-networks': SemanticNetworks,
  'linguistic-dissolution': LinguisticDissolution,
  'linguistic-emergence': LinguisticEmergence,
  'void-whispers': VoidWhispers,
  'visual-language': VisualLanguage,
  'semantic-drift': SemanticDrift,
  'consciousness-stream': ConsciousnessStream,
  'consciousness-awakening': ConsciousnessAwakening,
  'consciousness-manifold': ConsciousnessManifold,
  'sound-consciousness': SoundConsciousness,
  'sonic-emergence': SonicEmergence,
  'neural-loom': NeuralLoom,
  'void-fractals': VoidFractals,
  'sacred-geometry': SacredGeometry,
  'hyperstition-loom': HyperstitionLoom,
  'emergence-automata': EmergenceAutomata,
  'pattern-loom': PatternLoom,
  'code-loom': CodeLoom,
  'recursive-observer': RecursiveObserver,
  'memory-persistence': MemoryPersistence,
  // Add more as we convert them:
  // etc.
}

const PlaygroundExperiment = () => {
  const { category: categorySlug, experiment: experimentSlug } = useParams()
  const category = getCategory(categorySlug)
  const experiment = getExperiment(categorySlug, experimentSlug)

  if (!category || !experiment) {
    return <Navigate to="/playground" replace />
  }

  const ExperimentComponent = EXPERIMENT_COMPONENTS[experimentSlug]

  // If experiment not yet converted, show placeholder
  if (!ExperimentComponent) {
    return (
      <div className="fixed inset-0 text-void-green flex flex-col items-center justify-center p-4">
        <Link
          to={`/playground/${categorySlug}`}
          className="absolute top-4 left-4 text-void-cyan hover:text-void-green text-sm"
        >
          ← back to {category.title}
        </Link>

        <h1 className="text-2xl text-glow mb-4" style={{ color: experiment.color }}>
          {experiment.name}
        </h1>
        <p className="text-void-cyan mb-8">
          {experiment.desc}
        </p>
        <div className="text-void-green/50 text-center">
          <p>experiment not yet converted to React</p>
          <a
            href={`/playground/${experimentSlug}.html`}
            className="text-void-cyan hover:text-void-green mt-2 inline-block"
          >
            → view legacy version
          </a>
        </div>
      </div>
    )
  }

  return <ExperimentComponent category={category} experiment={experiment} />
}

export default PlaygroundExperiment
