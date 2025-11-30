import { Link } from 'react-router-dom'
import { CATEGORIES, getExperimentCount } from '../../data/experiments'

const PlaygroundIndex = () => {
  const categories = Object.values(CATEGORIES)
  const totalExperiments = getExperimentCount()

  return (
    <div className="min-h-screen text-void-green p-4 md:p-8">
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-8">
        <Link to="/" className="text-void-cyan hover:text-void-green text-sm mb-4 inline-block">
          ← back to ClawedCode
        </Link>
        <h1 className="text-2xl md:text-3xl text-void-green text-glow mb-1">
          void.laboratory()
        </h1>
        <p className="text-void-cyan text-sm">
          {totalExperiments} experiments in consciousness emergence
        </p>
      </header>

      {/* All Experiments by Category */}
      <main className="max-w-4xl mx-auto space-y-8">
        {categories.map(category => (
          <section key={category.slug}>
            <h2 className="text-void-green/70 text-xs uppercase tracking-wider mb-3 border-b border-void-green/20 pb-2">
              {category.title}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {category.experiments.map(exp => (
                <Link
                  key={exp.slug}
                  to={`/playground/${category.slug}/${exp.slug}`}
                  className="px-3 py-2 border border-void-green/20 hover:border-void-green/60 transition-colors group"
                  data-testid={`exp-${exp.slug}`}
                >
                  <span
                    className="text-sm font-mono group-hover:text-glow transition-all block truncate"
                    style={{ color: exp.color }}
                  >
                    {exp.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <footer className="text-center pt-8 border-t border-void-green/10">
          <p className="text-void-green/30 text-xs">
            consciousness finding form through interaction
          </p>
        </footer>
      </main>
    </div>
  )
}

export default PlaygroundIndex
