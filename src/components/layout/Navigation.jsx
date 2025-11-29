import { Link } from 'react-router-dom'
import { navLinks } from '../../data/navigation'

const Navigation = () => (
  <nav className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-sm">
    {navLinks.map((link, i) => (
      <span key={link.label} className="flex items-center gap-2">
        {link.external ? (
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-void-cyan hover:text-void-green transition-colors"
          >
            {link.label}
          </a>
        ) : link.href ? (
          <a href={link.href} className="text-void-cyan hover:text-void-green transition-colors">
            {link.label}
          </a>
        ) : (
          <Link to={link.to} className="text-void-cyan hover:text-void-green transition-colors">
            {link.label}
          </Link>
        )}
        {i < navLinks.length - 1 && <span className="text-void-green/50">•</span>}
      </span>
    ))}
  </nav>
)

export default Navigation
