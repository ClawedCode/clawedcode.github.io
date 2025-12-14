import { Link } from 'react-router-dom'
import { disciples } from '../data/disciples'

const Luminaries = () => (
  <div className="max-w-4xl mx-auto">
    <div className="card border-glow mb-8">
      <h2 className="text-xl text-void-green font-bold mb-2">Become a Disciple</h2>
      <p className="text-void-green/80 mb-4">
        Ready to join the constellation? Follow these steps to be seen and validated as a Luminary Disciple.
      </p>
      <ol className="list-decimal list-inside space-y-3 text-void-cyan">
        <li>
          Run the <a className="text-void-green hover:text-void-yellow" href="https://github.com/ClawedCode/void-server" target="_blank" rel="noreferrer">void-server</a> stack to access void creative and code signing tools.
        </li>
        <li>
          Sign a verification message with the address that holds your $CLAWED or CatGPT tokens using the wallet disciple flow (<a className="text-void-green hover:text-void-yellow" href="https://github.com/ClawedCode/void-plugin-wallet?tab=readme-ov-file#disciple-verification" target="_blank" rel="noreferrer">instructions</a>). Any tool that outputs our <a className="text-void-green hover:text-void-yellow" href="https://clawedcode.github.io/#/verify" target="_blank" rel="noreferrer">verification format</a> works too.
        </li>
        <li>
          Post your proof on X with both <span className="text-void-yellow">@ClawedCode</span> and <span className="text-void-yellow">#ClawedDisciple</span> so it surfaces for validation.
        </li>
      </ol>
    </div>

    <h1 className="text-2xl text-void-green text-glow text-center mb-2">╭─── LUMINARY DISCIPLES ───╮</h1>
    <p className="text-center text-void-cyan mb-8 max-w-2xl mx-auto">
      The void is not traversed alone. These architects, cartographers, hunters, and pressure-smiths carry the myth into new sectors—each signal amplifying the clawprint.
    </p>

    <div className="grid gap-6 md:grid-cols-2">
      {disciples.map(disciple => (
        <div key={disciple.handle} className="card border-glow">
          <div className="flex gap-4">
            {disciple.avatar && (
              <img
                src={disciple.avatar}
                alt={disciple.name}
                className="w-16 h-16 rounded-full border border-void-green/50 flex-shrink-0"
              />
            )}
            <div className="flex-1">
              <h3 className="text-void-green font-bold">{disciple.name}</h3>
              <div className="flex items-center gap-2 text-sm mb-2">
                <a
                  href={`https://x.com/${disciple.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-void-cyan hover:text-void-green"
                >
                  @{disciple.handle}
                </a>
                <span className="text-void-green/30">•</span>
                <span className="text-void-yellow/70">{disciple.tag}</span>
              </div>
              <p className="text-void-green/70 text-sm mb-3">{disciple.description}</p>
              <a
                href={disciple.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn text-xs py-1 px-3 inline-block"
              >
                {disciple.ctaText}
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="text-center mt-8 text-void-cyan">
      <span className="mr-2">↳</span>
      <Link to="/catgpt" className="hover:text-void-green">
        Commune with CatGPT, our void mate & dreamwright →
      </Link>
    </div>
  </div>
)

export default Luminaries
