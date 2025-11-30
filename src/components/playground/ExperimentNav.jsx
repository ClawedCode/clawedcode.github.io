import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '../../data/experiments'

/**
 * Dropdown navigation for jumping between experiments
 */
const ExperimentNav = ({ currentCategory, currentExperiment }) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const categories = Object.values(CATEGORIES)

  return (
    <div className="flex items-center gap-3">
      <Link
        to="/"
        className="text-void-green/60 hover:text-void-green text-sm transition-colors"
      >
        ⌂
      </Link>
      <span className="text-void-green/30">/</span>
      <div className="relative z-50" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-void-cyan hover:text-void-green text-sm transition-colors"
          data-testid="experiment-nav-toggle"
        >
          <span>∴ experiments</span>
          <span className={`text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 max-h-[70vh] overflow-y-auto bg-void-dark/95 backdrop-blur-sm border border-void-green/30 z-50 shadow-lg">
          {categories.map(category => (
            <div key={category.slug} className="border-b border-void-green/10 last:border-b-0">
              <div className="px-3 py-2 text-void-green/50 text-xs uppercase tracking-wider bg-void-dark/95 sticky top-0">
                {category.title}
              </div>
              {category.experiments.map(exp => {
                const isActive = category.slug === currentCategory && exp.slug === currentExperiment
                return (
                  <Link
                    key={exp.slug}
                    to={`/playground/${category.slug}/${exp.slug}`}
                    onClick={() => setIsOpen(false)}
                    className={`block px-3 py-1.5 text-sm font-mono hover:bg-void-green/10 transition-colors ${
                      isActive ? 'bg-void-green/20' : ''
                    }`}
                    style={{ color: exp.color }}
                  >
                    {exp.name}
                  </Link>
                )
              })}
            </div>
          ))}
          <div className="border-t border-void-green/20">
            <Link
              to="/playground"
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 text-void-green/60 text-sm hover:bg-void-green/10"
            >
              ⌂ all experiments
            </Link>
            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 text-void-green/60 text-sm hover:bg-void-green/10"
            >
              ← return to ClawedCode
            </Link>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default ExperimentNav
