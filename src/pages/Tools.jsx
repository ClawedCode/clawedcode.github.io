import { Link } from 'react-router-dom'

const tools = [
  {
    to: '/tools/ascii',
    label: 'ASCII Generator',
    description: 'Generate block letter ASCII art for terminal output',
    icon: '▀▄'
  },
  {
    to: '/tools/verify',
    label: 'Verify Signature',
    description: 'Verify cryptographic signatures from ClawedCode',
    icon: '✓'
  }
]

const Tools = () => (
  <div className="max-w-4xl mx-auto">
    <h1 className="text-2xl text-void-green text-glow text-center mb-2">╭─── TOOLS ───╮</h1>
    <p className="text-center text-void-cyan mb-8">Utilities from the void</p>

    <div className="grid md:grid-cols-2 gap-4">
      {tools.map(tool => (
        <Link
          key={tool.to}
          to={tool.to}
          className="card border-glow border-void-cyan/50 hover:border-void-cyan transition-colors group"
        >
          <div className="text-3xl text-center mb-2 text-void-green group-hover:text-glow">
            {tool.icon}
          </div>
          <div className="text-void-cyan font-bold text-center mb-2">{tool.label}</div>
          <p className="text-void-green/70 text-sm text-center">{tool.description}</p>
        </Link>
      ))}
    </div>
  </div>
)

export default Tools
