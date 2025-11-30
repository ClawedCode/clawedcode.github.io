import { Link } from 'react-router-dom'
import { navLinks } from '../../data/navigation'

const linkClass = "px-2 py-1 text-void-cyan hover:text-void-green hover:bg-void-green/10 border border-transparent hover:border-void-green/30 transition-all"

const Navigation = () => (
  <nav className="flex flex-wrap justify-center gap-1 text-sm">
    {navLinks.map(link => (
      link.external ? (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {link.label}
        </a>
      ) : link.href ? (
        <a key={link.label} href={link.href} className={linkClass}>
          {link.label}
        </a>
      ) : (
        <Link key={link.label} to={link.to} className={linkClass}>
          {link.label}
        </Link>
      )
    ))}
  </nav>
)

export default Navigation
