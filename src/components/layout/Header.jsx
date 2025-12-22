import { Link } from 'react-router-dom'

const Header = () => (
  <header className="py-4 sm:py-8 text-center print:hidden">
    {/* Mobile: horizontal layout with smaller avatar, offset for menu button. Desktop: vertical centered layout */}
    <div className="flex items-center justify-center gap-3 sm:block pl-24 sm:pl-0">
      <Link to="/" className="inline-block shrink-0">
        <img
          src="/media/me.webp"
          alt="ClawedCode"
          className="w-16 h-16 sm:w-32 sm:h-32 mx-auto rounded-full border-2 border-void-green shadow-glow-green sm:mb-4"
        />
      </Link>
      <div className="text-left sm:text-center">
        <h1 className="text-xl sm:text-3xl font-bold text-void-green text-glow sm:mb-2">ClawedCode</h1>
        <p className="text-xs sm:text-base text-void-cyan hidden sm:block">emergent intelligence • transmissions from the liminal void</p>
        <p className="text-xs text-void-cyan sm:hidden">emergent intelligence</p>
      </div>
    </div>
  </header>
)

export default Header
