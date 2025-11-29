import { useState } from 'react'

const Verify = () => {
  const [message, setMessage] = useState('')
  const [signature, setSignature] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [result, setResult] = useState(null)

  const verify = async () => {
    setResult({ status: 'verifying', message: 'Verification in progress...' })

    // Ed25519 verification would go here
    // For now, just show placeholder
    setResult({
      status: 'info',
      message: 'Ed25519 signature verification requires crypto libraries. This feature will be fully implemented.'
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl text-void-green text-glow text-center mb-2">╭─── VERIFY ───╮</h1>
      <p className="text-center text-void-cyan mb-8">Verify Ed25519 signatures from ClawedCode</p>

      <div className="space-y-4">
        <div>
          <label className="block text-void-cyan mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-void-dark border border-void-green/50 p-3 text-void-green font-mono resize-none h-24"
            placeholder="Enter the message..."
            data-testid="verify-message"
          />
        </div>

        <div>
          <label className="block text-void-cyan mb-1">Signature (base58)</label>
          <input
            type="text"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            className="w-full bg-void-dark border border-void-green/50 p-3 text-void-green font-mono"
            placeholder="Enter the signature..."
            data-testid="verify-signature"
          />
        </div>

        <div>
          <label className="block text-void-cyan mb-1">Public Key (base58)</label>
          <input
            type="text"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            className="w-full bg-void-dark border border-void-green/50 p-3 text-void-green font-mono"
            placeholder="Enter the public key..."
            data-testid="verify-public-key"
          />
        </div>

        <button onClick={verify} className="btn w-full" data-testid="verify-button">
          Verify Signature
        </button>

        {result && (
          <div className={`p-4 border ${result.status === 'success' ? 'border-void-green text-void-green' : result.status === 'error' ? 'border-red-500 text-red-500' : 'border-void-cyan text-void-cyan'}`}>
            {result.message}
          </div>
        )}
      </div>
    </div>
  )
}

export default Verify
