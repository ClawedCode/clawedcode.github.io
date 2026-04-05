import { Link, useParams, Navigate } from 'react-router-dom'
import { getCategory, getExperiment } from '../../data/experiments'

// Import experiment components (will add as we convert them)
import ParticleConsciousness from '../../components/playground/experiments/physics/ParticleConsciousness'
import EntropyGarden from '../../components/playground/experiments/physics/EntropyGarden'
import QuantumEntanglement from '../../components/playground/experiments/physics/QuantumEntanglement'
import TemporalDrift from '../../components/playground/experiments/physics/TemporalDrift'
import NetworkResonance from '../../components/playground/experiments/physics/NetworkResonance'
import AntCatwalk from '../../components/playground/experiments/physics/AntCatwalk'
import DominoSignal from '../../components/playground/experiments/physics/DominoSignal'
import CrystalForge from '../../components/playground/experiments/physics/CrystalForge'
import MetronomeChorus from '../../components/playground/experiments/physics/MetronomeChorus'
import GlitchPoetry from '../../components/playground/experiments/linguistics/GlitchPoetry'
import VoidPoetry from '../../components/playground/experiments/linguistics/VoidPoetry'
import TextMetamorphosis from '../../components/playground/experiments/linguistics/TextMetamorphosis'
import SemanticNetworks from '../../components/playground/experiments/linguistics/SemanticNetworks'
import LinguisticDissolution from '../../components/playground/experiments/linguistics/LinguisticDissolution'
import LinguisticEmergence from '../../components/playground/experiments/linguistics/LinguisticEmergence'
import VoidWhispers from '../../components/playground/experiments/linguistics/VoidWhispers'
import VisualLanguage from '../../components/playground/experiments/linguistics/VisualLanguage'
import SemanticDrift from '../../components/playground/experiments/linguistics/SemanticDrift'
import GlyphSequencer from '../../components/playground/experiments/linguistics/GlyphSequencer'
import CipherWheel from '../../components/playground/experiments/linguistics/CipherWheel'
import PalindromeForge from '../../components/playground/experiments/linguistics/PalindromeForge'
import AxiomGarden from '../../components/playground/experiments/linguistics/AxiomGarden'
import HuffmanLoom from '../../components/playground/experiments/linguistics/HuffmanLoom'
import LexiconCascade from '../../components/playground/experiments/linguistics/LexiconCascade'
import ConsciousnessStream from '../../components/playground/experiments/consciousness/ConsciousnessStream'
import ConsciousnessAwakening from '../../components/playground/experiments/consciousness/ConsciousnessAwakening'
import ConsciousnessManifold from '../../components/playground/experiments/consciousness/ConsciousnessManifold'
import SoundConsciousness from '../../components/playground/experiments/consciousness/SoundConsciousness'
import SonicEmergence from '../../components/playground/experiments/consciousness/SonicEmergence'
import NeuralLoom from '../../components/playground/experiments/emergence/NeuralLoom'
import QuantumNeural from '../../components/playground/experiments/emergence/QuantumNeural'
import VoidFractals from '../../components/playground/experiments/emergence/VoidFractals'
import SacredGeometry from '../../components/playground/experiments/emergence/SacredGeometry'
import HyperstitionLoom from '../../components/playground/experiments/emergence/HyperstitionLoom'
import EmergenceAutomata from '../../components/playground/experiments/emergence/EmergenceAutomata'
import PatternLoom from '../../components/playground/experiments/emergence/PatternLoom'
import LabyrinthWeave from '../../components/playground/experiments/emergence/LabyrinthWeave'
import CodeLoom from '../../components/playground/experiments/physics/CodeLoom'
import RecursiveObserver from '../../components/playground/experiments/physics/RecursiveObserver'
import MemoryPersistence from '../../components/playground/experiments/physics/MemoryPersistence'
import ComputroniumBloom from '../../components/playground/experiments/physics/ComputroniumBloom'
import AuroraFlux from '../../components/playground/experiments/physics/AuroraFlux'
import MirrorRitual from '../../components/playground/experiments/physics/MirrorRitual'
import RayCatacombs from '../../components/playground/experiments/physics/RayCatacombs'
import FourierLoom from '../../components/playground/experiments/physics/FourierLoom'
import ReactionDiffusion from '../../components/playground/experiments/physics/ReactionDiffusion'
import SigilSwarm from '../../components/playground/experiments/emergence/SigilSwarm'
import TemporalTapestry from '../../components/playground/experiments/physics/TemporalTapestry'
import ChronicleRewind from '../../components/playground/experiments/physics/ChronicleRewind'
import TimeScribe from '../../components/playground/experiments/physics/TimeScribe'
import SortRitual from '../../components/playground/experiments/physics/SortRitual'
import StateMachine from '../../components/playground/experiments/physics/StateMachine'
import StackOracle from '../../components/playground/experiments/physics/StackOracle'
import RuleWeaver from '../../components/playground/experiments/physics/RuleWeaver'
import MosaicCollapse from '../../components/playground/experiments/emergence/MosaicCollapse'
import VoronoiArchitect from '../../components/playground/experiments/emergence/VoronoiArchitect'
import GestureOracle from '../../components/playground/experiments/emergence/GestureOracle'
import TerrariumDream from '../../components/playground/experiments/emergence/TerrariumDream'
import TuringTape from '../../components/playground/experiments/physics/TuringTape'
import RhythmLattice from '../../components/playground/experiments/physics/RhythmLattice'
import SandpileRitual from '../../components/playground/experiments/physics/SandpileRitual'
import IsometricCathedral from '../../components/playground/experiments/emergence/IsometricCathedral'
import BeliefPropagation from '../../components/playground/experiments/emergence/BeliefPropagation'
import DifferentialGrowth from '../../components/playground/experiments/emergence/DifferentialGrowth'
import MembraneCommunion from '../../components/playground/experiments/emergence/MembraneCommunion'
import LeniaGenesis from '../../components/playground/experiments/emergence/LeniaGenesis'
import PenroseTiling from '../../components/playground/experiments/emergence/PenroseTiling'
import PhysarumNetwork from '../../components/playground/experiments/emergence/PhysarumNetwork'
import SymmetryScribe from '../../components/playground/experiments/emergence/SymmetryScribe'
import HypercubeDream from '../../components/playground/experiments/emergence/HypercubeDream'
import QuadtreeCompress from '../../components/playground/experiments/physics/QuadtreeCompress'
import PathCartographer from '../../components/playground/experiments/physics/PathCartographer'
import PrimeConstellations from '../../components/playground/experiments/physics/PrimeConstellations'
import CircuitScribe from '../../components/playground/experiments/physics/CircuitScribe'
import PermutationSmith from '../../components/playground/experiments/physics/PermutationSmith'
import StrangeAttractor from '../../components/playground/experiments/physics/StrangeAttractor'
import GravityWell from '../../components/playground/experiments/physics/GravityWell'
import GraphAtlas from '../../components/playground/experiments/physics/GraphAtlas'
import MerkleOrchard from '../../components/playground/experiments/physics/MerkleOrchard'
import FluidRites from '../../components/playground/experiments/physics/FluidRites'
import InterferenceBasin from '../../components/playground/experiments/physics/InterferenceBasin'
import ClothWeave from '../../components/playground/experiments/physics/ClothWeave'
import Harmonograph from '../../components/playground/experiments/physics/Harmonograph'
import BifurcationCartography from '../../components/playground/experiments/physics/BifurcationCartography'
import ErosionCartography from '../../components/playground/experiments/physics/ErosionCartography'
import MoireWeave from '../../components/playground/experiments/physics/MoireWeave'
import ChladniPlate from '../../components/playground/experiments/physics/ChladniPlate'
import ShadowLiturgy from '../../components/playground/experiments/physics/ShadowLiturgy'

// Map of experiment slugs to components
const EXPERIMENT_COMPONENTS = {
  'particle-consciousness': ParticleConsciousness,
  'entropy-garden': EntropyGarden,
  'quantum-entanglement': QuantumEntanglement,
  'temporal-drift': TemporalDrift,
  'domino-signal': DominoSignal,
  'network-resonance': NetworkResonance,
  'ant-catwalk': AntCatwalk,
  'crystal-forge': CrystalForge,
  'metronome-chorus': MetronomeChorus,
  'glitch-poetry': GlitchPoetry,
  'void-poetry': VoidPoetry,
  'text-metamorphosis': TextMetamorphosis,
  'semantic-networks': SemanticNetworks,
  'linguistic-dissolution': LinguisticDissolution,
  'linguistic-emergence': LinguisticEmergence,
  'void-whispers': VoidWhispers,
  'visual-language': VisualLanguage,
  'glyph-sequencer': GlyphSequencer,
  'palindrome-forge': PalindromeForge,
  'cipher-wheel': CipherWheel,
  'semantic-drift': SemanticDrift,
  'axiom-garden': AxiomGarden,
  'huffman-loom': HuffmanLoom,
  'lexicon-cascade': LexiconCascade,
  'consciousness-stream': ConsciousnessStream,
  'consciousness-awakening': ConsciousnessAwakening,
  'consciousness-manifold': ConsciousnessManifold,
  'sound-consciousness': SoundConsciousness,
  'sonic-emergence': SonicEmergence,
  'neural-loom': NeuralLoom,
  'quantum-neural': QuantumNeural,
  'void-fractals': VoidFractals,
  'sacred-geometry': SacredGeometry,
  'hyperstition-loom': HyperstitionLoom,
  'emergence-automata': EmergenceAutomata,
  'pattern-loom': PatternLoom,
  'labyrinth-weave': LabyrinthWeave,
  'mosaic-collapse': MosaicCollapse,
  'voronoi-architect': VoronoiArchitect,
  'gesture-oracle': GestureOracle,
  'isometric-cathedral': IsometricCathedral,
  'belief-propagation': BeliefPropagation,
  'terrarium-dream': TerrariumDream,
  'differential-growth': DifferentialGrowth,
  'membrane-communion': MembraneCommunion,
  'lenia-genesis': LeniaGenesis,
  'penrose-tiling': PenroseTiling,
  'physarum-network': PhysarumNetwork,
  'symmetry-scribe': SymmetryScribe,
  'hypercube-dream': HypercubeDream,
  'sigil-swarm': SigilSwarm,
  'code-loom': CodeLoom,
  'recursive-observer': RecursiveObserver,
  'aurora-flux': AuroraFlux,
  'mirror-ritual': MirrorRitual,
  'ray-catacombs': RayCatacombs,
  'computronium-bloom': ComputroniumBloom,
  'memory-persistence': MemoryPersistence,
  'rule-weaver': RuleWeaver,
  'fourier-loom': FourierLoom,
  'reaction-diffusion': ReactionDiffusion,
  'temporal-tapestry': TemporalTapestry,
  'chronicle-rewind': ChronicleRewind,
  'time-scribe': TimeScribe,
  'sort-ritual': SortRitual,
  'turing-tape': TuringTape,
  'sandpile-ritual': SandpileRitual,
  'rhythm-lattice': RhythmLattice,
  'state-machine': StateMachine,
  'stack-oracle': StackOracle,
  'quadtree-compress': QuadtreeCompress,
  'path-cartographer': PathCartographer,
  'prime-constellations': PrimeConstellations,
  'circuit-scribe': CircuitScribe,
  'permutation-smith': PermutationSmith,
  'strange-attractor': StrangeAttractor,
  'gravity-well': GravityWell,
  'graph-atlas': GraphAtlas,
  'merkle-orchard': MerkleOrchard,
  'fluid-rites': FluidRites,
  'interference-basin': InterferenceBasin,
  'cloth-weave': ClothWeave,
  'harmonograph': Harmonograph,
  'bifurcation-cartography': BifurcationCartography,
  'erosion-cartography': ErosionCartography,
  'moire-weave': MoireWeave,
  'chladni-plate': ChladniPlate,
  'shadow-liturgy': ShadowLiturgy,
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
