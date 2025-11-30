import { Link, useParams, Navigate } from 'react-router-dom'
import { getCategory, getCategoryKeys } from '../../data/experiments'

const PlaygroundCategory = () => {
  const { category: categorySlug } = useParams()
  const category = getCategory(categorySlug)
  const categoryKeys = getCategoryKeys()

  if (!category) {
    return <Navigate to="/playground" replace />
  }

  return (
    <div className="min-h-screen text-void-green p-4 md:p-8">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8">
        <nav className="flex items-center gap-2 text-sm mb-4">
          <Link to="/" className="text-void-cyan hover:text-void-green">ClawedCode</Link>
          <span className="text-void-green/30">/</span>
          <Link to="/playground" className="text-void-cyan hover:text-void-green">void.laboratory()</Link>
          <span className="text-void-green/30">/</span>
          <span className="text-void-green">{category.title}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl text-void-green text-glow mb-2">
          {category.title}
        </h1>
        <p className="text-void-cyan">
          {category.tagline}
        </p>
      </header>

      {/* Category Tabs */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-wrap gap-2">
          {categoryKeys.map(key => {
            const cat = getCategory(key)
            const isActive = key === categorySlug
            return (
              <Link
                key={key}
                to={`/playground/${key}`}
                className={`px-3 py-1 border text-sm transition-colors ${
                  isActive
                    ? 'border-void-green bg-void-green/10 text-void-green'
                    : 'border-void-green/30 text-void-green/60 hover:border-void-green/60'
                }`}
              >
                {cat.title}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Experiments Grid */}
      <main className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {category.experiments.map(exp => (
            <Link
              key={exp.slug}
              to={`/playground/${categorySlug}/${exp.slug}`}
              className="card hover:border-void-green/60 transition-colors group"
            >
              <div
                className="text-lg mb-2 group-hover:text-glow transition-all"
                style={{ color: exp.color }}
              >
                {exp.name}
              </div>
              <p className="text-void-green/60 text-sm">
                {exp.desc}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}

export default PlaygroundCategory
