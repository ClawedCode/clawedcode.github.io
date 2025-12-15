import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { internalLinks, externalLinks } from '../../data/navigation'

const Navigation = () => {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const isActive = link => {
    if (!link.to) return false
    if (link.to === '/') return location.pathname === '/'
    return location.pathname === link.to || location.pathname.startsWith(`${link.to}/`)
  }

  const handleNavigate = () => setOpen(false)

  const linkClasses = link => {
    const active = isActive(link)
    return `group flex items-center justify-between rounded border px-3 py-2 text-sm transition-colors ${
      active
        ? 'border-void-green bg-void-green/10 text-void-green shadow-glow-green'
        : 'border-void-green/20 text-void-cyan hover:text-void-green hover:border-void-green/50 hover:bg-void-green/5'
    }`
  }

  const renderLink = link =>
    link.external ? (
      <a
        key={link.label}
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClasses(link)}
        onClick={handleNavigate}
      >
        <span>{link.label}</span>
        <span className="text-xs text-void-cyan/70 group-hover:text-void-green">↗</span>
      </a>
    ) : link.href ? (
      <a key={link.label} href={link.href} className={linkClasses(link)} onClick={handleNavigate}>
        {link.label}
      </a>
    ) : (
      <Link key={link.label} to={link.to} className={linkClasses(link)} onClick={handleNavigate}>
        {link.label}
      </Link>
    )

  return (
    <>
      <button
        className="fixed top-4 left-4 z-30 inline-flex items-center gap-2 rounded border border-void-green/40 bg-void-dark/90 px-3 py-2 text-sm text-void-cyan shadow-glow-green hover:border-void-green hover:text-void-green md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <span className="text-lg">☰</span>
        <span>menu</span>
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-void-green/30 bg-void-dark/90 backdrop-blur transition-transform ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } flex flex-col`}
      >
        <div className="flex items-center justify-between border-b border-void-green/30 px-4 py-3">
          <span className="text-void-green font-semibold tracking-wide">🐈‍⬛@public:~</span>
          <button
            className="md:hidden text-void-cyan hover:text-void-green"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 md:flex-none">
          <div className="grid gap-2">
            {internalLinks.map(renderLink)}
          </div>
          <hr className="my-4 border-void-green/30" />
          <div className="grid gap-2">
            {externalLinks.map(renderLink)}
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/70 md:hidden" onClick={() => setOpen(false)} />}
    </>
  )
}

export default Navigation
