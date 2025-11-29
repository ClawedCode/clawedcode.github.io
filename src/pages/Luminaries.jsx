import { Link } from 'react-router-dom'
import { disciples } from '../data/disciples'

const Luminaries = () => (
  <div className="max-w-4xl mx-auto">
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
