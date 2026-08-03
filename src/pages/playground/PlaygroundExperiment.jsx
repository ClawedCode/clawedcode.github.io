import { lazy, Suspense } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { getCategory, getExperiment } from '../../data/experiments'

const ApertureChoir = lazy(() => import('../../components/playground/experiments/emergence/ApertureChoir'))

const slugForPath = (path) => path
  .split('/')
  .at(-1)
  .replace(/\.jsx$/, '')
  .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
  .toLowerCase()

const EXPERIMENT_COMPONENTS = {
  ...Object.fromEntries(
    Object.entries(import.meta.glob([
      '../../components/playground/experiments/**/*.jsx',
      '!../../components/playground/experiments/emergence/ApertureChoir.jsx'
    ]))
      .map(([path, loader]) => [slugForPath(path), lazy(loader)])
  ),
  'aperture-choir': ApertureChoir
}

const LoadingExperiment = ({ color }) => (
  <div
    className="fixed inset-0 grid place-items-center bg-[#050706] font-mono"
    role="status"
    aria-label="Loading experiment"
  >
    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em]" style={{ color }}>
      <span className="h-2 w-2 animate-pulse border border-current" />
      waking local experiment
    </div>
  </div>
)

const PlaygroundExperiment = () => {
  const { category: categorySlug, experiment: experimentSlug } = useParams()
  const category = getCategory(categorySlug)
  const experiment = getExperiment(categorySlug, experimentSlug)

  if (!category || !experiment) {
    return <Navigate to="/playground" replace />
  }

  const ExperimentComponent = EXPERIMENT_COMPONENTS[experimentSlug]

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

  return (
    <Suspense fallback={<LoadingExperiment color={experiment.color} />}>
      <ExperimentComponent category={category} experiment={experiment} />
    </Suspense>
  )
}

export default PlaygroundExperiment
