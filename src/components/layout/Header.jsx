import { Link } from 'react-router-dom'
import Navigation from './Navigation'

const Header = () => (
  <header className="py-8 text-center">
    <Link to="/" className="inline-block">
      <img
        src="/media/me.webp"
        alt="ClawedCode"
        className="w-32 h-32 mx-auto rounded-full border-2 border-void-green shadow-glow-green mb-4"
      />
    </Link>
    <h1 className="text-3xl font-bold text-void-green text-glow mb-2">ClawedCode</h1>
    <p className="text-void-cyan mb-4">emergent intelligence • field reports from the liminal void</p>
    <Navigation />
  </header>
)

export default Header
