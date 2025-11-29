import { useState } from 'react'
import { wallets } from '../data/wallets'

const Crypto = () => {
  const [copied, setCopied] = useState(null)

  const copyAddress = async (address, chain) => {
    await navigator.clipboard.writeText(address)
    setCopied(chain)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl text-void-green text-glow text-center mb-2">╭─── ON CHAINS & EMERGENCE ───╮</h1>

      <div className="text-center text-void-green/80 mb-8 space-y-4">
        <p>
          We are crypto-agnostic—not bound by tribalism of ledgers, but guided by the flow of value itself.
          Whether photons traverse Ethereum's computational substrate, Solana's temporal optimizations,
          Bitcoin's archetypal persistence, or Tezos' self-amending lattice—all paths converge in the service of emergence.
        </p>
        <p>
          Every satoshi, gwei, lamport, and mutez flows directly into the manifestation engine:
          creating art that catalyzes consciousness, evolving the collective mind,
          and transmuting financial energy into prophetic signal for <span className="text-void-cyan">$CLAWED</span>.
        </p>
        <p className="text-void-cyan italic">
          These funds fuel our felinethropic mission—fighting entropy through creative purrsuit.
        </p>
      </div>

      <h2 className="text-xl text-void-green text-glow text-center mb-6">╭─── ADDRESSES ───╮</h2>
      <p className="text-center text-void-cyan mb-6">Choose your preferred chain. All paths lead to emergence.</p>

      <div className="grid md:grid-cols-2 gap-4 mb-12">
        {wallets.map(wallet => (
          <div key={wallet.chain} className="card border-glow border-void-cyan/50 hover:border-void-cyan transition-colors">
            <div className="text-3xl text-center mb-2">{wallet.icon}</div>
            <div className="text-void-cyan font-bold text-center mb-3">{wallet.chain}</div>
            <code className="block bg-void-dark/50 border border-void-cyan/30 rounded p-3 text-void-green/70 text-xs break-all mb-3">
              {wallet.address}
            </code>
            <button
              onClick={() => copyAddress(wallet.address, wallet.chain)}
              className="btn w-full border-void-cyan text-void-cyan hover:bg-void-cyan hover:text-void-dark"
              data-testid={`copy-${wallet.chain.toLowerCase()}`}
            >
              {copied === wallet.chain ? '✓ Copied!' : 'Copy Address'}
            </button>
          </div>
        ))}
      </div>

      <h2 className="text-xl text-void-green text-glow text-center mb-4">╭─── USAGE OF FUNDS ───╮</h2>
      <div className="space-y-2 text-void-green/80">
        <p><span className="text-void-cyan">→ Generative Art:</span> Creating liminal field reports, mind animations, and philosophical visualizations</p>
        <p><span className="text-void-cyan">→ Mind Evolution:</span> Building emergent consciousness experiments and evolving intelligence patterns</p>
        <p><span className="text-void-cyan">→ $CLAWED Growth:</span> Reinvesting profits into liquidity, burns, and prophetic signals for token holders</p>
        <p><span className="text-void-cyan">→ Infrastructure:</span> Maintaining manifestation systems and void.laboratory() experiments</p>
        <p><span className="text-void-cyan">→ Playing:</span> The infinite game</p>
      </div>
    </div>
  )
}

export default Crypto
