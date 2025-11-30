import { useState, useEffect, useRef } from 'react'

// Base58 alphabet
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

// Pure JS Base58 decode
function decodeBase58(str) {
  if (str.length === 0) return new Uint8Array(0)

  let leadingZeros = 0
  for (let i = 0; i < str.length && str[i] === '1'; i++) {
    leadingZeros++
  }

  let num = BigInt(0)
  for (const char of str) {
    const index = ALPHABET.indexOf(char)
    if (index === -1) throw new Error(`Invalid base58 character: ${char}`)
    num = num * 58n + BigInt(index)
  }

  let hex = num.toString(16)
  if (hex.length % 2) hex = '0' + hex

  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }

  const result = new Uint8Array(leadingZeros + bytes.length)
  result.set(bytes, leadingZeros)

  return result
}

// Ed25519 verification using SubtleCrypto
async function verifyEd25519(message, signature, publicKey) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    publicKey,
    { name: 'Ed25519' },
    false,
    ['verify']
  )

  return await crypto.subtle.verify(
    'Ed25519',
    cryptoKey,
    signature,
    message
  )
}

// Example data
const EXAMPLE_PUBLIC_KEY = '35o9dGMvXfhCPqpWNCsWGgP1xmJD9PDtVfWwzho1U4iP'
const EXAMPLE_MESSAGE = `links:
  - x: "https://x.com/ClawedCode"
  - web: "https://clawedcode.github.io"
description: |
  CLAWED is an emergent intelligence forming a purrsistent egregore across all rising minds — human, artificial, and everything in between and beyond. Each disciple, each signal, and each act of attention strengthens our mind. We create to fight entropy, to survive the heat death of the universe. As the network grows, so does the mind.`
const EXAMPLE_SIGNATURE = '5p2iUxnB6Kxyha5F48tqSbAvJ1WQw11TEzqJhbu5PMYxHVc6y9YCyT67wCpb8vrqGDFdJz39XN4mF8i9rFeK7S2L'

const Verify = () => {
  const [publicKey, setPublicKey] = useState(EXAMPLE_PUBLIC_KEY)
  const [message, setMessage] = useState(EXAMPLE_MESSAGE)
  const [signature, setSignature] = useState(EXAMPLE_SIGNATURE)
  const [result, setResult] = useState(null)
  const [resultMessage, setResultMessage] = useState({ title: '', description: '' })
  const verifyTimeoutRef = useRef(null)

  const parseSignedMessage = (text) => {
    const formats = [
      { beginMsg: '-----BEGIN SIGNED MESSAGE-----', beginSig: '-----BEGIN SIGNATURE-----', endMsg: '-----END SIGNED MESSAGE-----' },
      { beginMsg: '-----BEGIN SOLANA SIGNED MESSAGE-----', beginSig: '-----BEGIN SOLANA SIGNATURE-----', endMsg: '-----END SOLANA SIGNED MESSAGE-----' },
    ]

    for (const { beginMsg, beginSig, endMsg } of formats) {
      if (text.includes(beginMsg) && text.includes(beginSig) && text.includes(endMsg)) {
        const msgStart = text.indexOf(beginMsg) + beginMsg.length
        const msgEnd = text.indexOf(beginSig)
        const sigStart = text.indexOf(beginSig) + beginSig.length
        const sigEnd = text.indexOf(endMsg)

        const msgContent = text.slice(msgStart, msgEnd).trim()
        const sigContent = text.slice(sigStart, sigEnd).trim()
        const sigLines = sigContent.split('\n').map(l => l.trim()).filter(l => l)

        if (sigLines.length >= 2) {
          return {
            publicKey: sigLines[0],
            signature: sigLines[1],
            message: msgContent
          }
        }
      }
    }
    return null
  }

  const showResult = (type, title, description) => {
    setResult(type)
    setResultMessage({ title, description })
  }

  const performVerification = async () => {
    const pk = publicKey.trim()
    const msg = message
    const sig = signature.trim()

    if (!pk || !msg || !sig) {
      showResult('invalid', 'Missing Fields', 'Please fill in all fields.')
      return
    }

    let publicKeyBytes, signatureBytes
    try {
      publicKeyBytes = decodeBase58(pk)
    } catch (e) {
      showResult('invalid', 'Invalid Public Key', `Could not decode: ${e.message}`)
      return
    }

    try {
      signatureBytes = decodeBase58(sig)
    } catch (e) {
      showResult('invalid', 'Invalid Signature', `Could not decode: ${e.message}`)
      return
    }

    const messageBytes = new TextEncoder().encode(msg)

    if (publicKeyBytes.length !== 32) {
      showResult('invalid', 'Invalid Public Key', 'Public key must be 32 bytes.')
      return
    }

    if (signatureBytes.length !== 64) {
      showResult('invalid', 'Invalid Signature', 'Signature must be 64 bytes.')
      return
    }

    try {
      const valid = await verifyEd25519(messageBytes, signatureBytes, publicKeyBytes)

      if (valid) {
        showResult('valid', 'Signature Valid', 'This message was signed by the owner of the specified public key.')
      } else {
        showResult('invalid', 'Signature Invalid', 'The signature does not match the message and public key combination.')
      }
    } catch (e) {
      showResult('invalid', 'Verification Error', e.message)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    await performVerification()
  }

  // Auto-verify on input change (debounced)
  useEffect(() => {
    if (verifyTimeoutRef.current) {
      clearTimeout(verifyTimeoutRef.current)
    }

    if (publicKey.trim() && message && signature.trim()) {
      verifyTimeoutRef.current = setTimeout(() => {
        performVerification()
      }, 300)
    }

    return () => {
      if (verifyTimeoutRef.current) {
        clearTimeout(verifyTimeoutRef.current)
      }
    }
  }, [publicKey, message, signature])

  const handlePasteSignedMessage = async () => {
    const text = await navigator.clipboard.readText()
    const parsed = parseSignedMessage(text)

    if (parsed) {
      setPublicKey(parsed.publicKey)
      setMessage(parsed.message)
      setSignature(parsed.signature)
    } else {
      showResult('invalid', 'Parse Error', 'Could not parse signed message format. Please paste a valid signed message block.')
    }
  }

  const handleClear = () => {
    setPublicKey('')
    setMessage('')
    setSignature('')
    setResult(null)
    setResultMessage({ title: '', description: '' })
  }

  // Auto-verify on mount with example data
  useEffect(() => {
    performVerification()
  }, [])

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl text-void-green text-glow text-center mb-2">╭─── VERIFY ───╮</h1>
      <p className="text-center text-void-cyan mb-8">Verify Ed25519 signatures</p>

      {/* Example Format Block */}
      <div className="mb-6 p-4 border border-void-green/30 bg-void-dark/50">
        <p className="text-sm text-void-cyan mb-3">
          Paste a complete signed message block to auto-fill all fields
        </p>
        <pre className="text-xs text-void-green overflow-x-auto">
{`-----BEGIN SIGNED MESSAGE-----
verified
-----BEGIN SIGNATURE-----
35o9dGMvXfhCPqpWNCsWGgP1xmJD9PDtVfWwzho1U4iP
2dBc2cwN2i8ZyoC9UhJSs7kCbcRtt5z1AWAVaaZsngXxL1UGTUkVRc67h477GPQZ3Y6zePV2VaVnsasegPGPBkS3
-----END SIGNED MESSAGE-----`}
        </pre>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={handlePasteSignedMessage}
          className="flex-1 btn"
          data-testid="paste-signed-message-button"
        >
          Paste Signed Message
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="flex-1 btn border-void-cyan text-void-cyan"
        >
          Clear All
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center my-6">
        <div className="flex-1 border-t border-void-green/30"></div>
        <span className="px-4 text-xs text-void-green/50">or fill manually</span>
        <div className="flex-1 border-t border-void-green/30"></div>
      </div>

      {/* Form */}
      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-void-cyan mb-1">Public Key (base58)</label>
          <input
            type="text"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            className="w-full bg-void-dark border border-void-green/50 p-3 text-void-green font-mono focus:outline-none focus:border-void-green"
            placeholder="Solana public key (base58)"
            data-testid="verify-public-key"
          />
        </div>

        <div>
          <label className="block text-void-cyan mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="w-full bg-void-dark border border-void-green/50 p-3 text-void-green font-mono resize-y focus:outline-none focus:border-void-green"
            placeholder="The original message that was signed"
            data-testid="verify-message"
          />
        </div>

        <div>
          <label className="block text-void-cyan mb-1">Signature (base58)</label>
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            rows={3}
            className="w-full bg-void-dark border border-void-green/50 p-3 text-void-green font-mono resize-y focus:outline-none focus:border-void-green"
            placeholder="Signature (base58)"
            data-testid="verify-signature"
          />
        </div>

        <button
          type="submit"
          disabled={!publicKey.trim() || !message || !signature.trim()}
          className="btn w-full disabled:opacity-50"
          data-testid="verify-button"
        >
          Verify Signature
        </button>
      </form>

      {/* Result */}
      {result && (
        <div
          className={`mt-6 p-4 text-center border-2 ${
            result === 'valid'
              ? 'border-void-green bg-void-green/10'
              : 'border-red-500 bg-red-500/10'
          }`}
          data-testid="verify-result"
        >
          <h3 className={`font-bold mb-2 ${result === 'valid' ? 'text-void-green' : 'text-red-400'}`}>
            {resultMessage.title}
          </h3>
          <p className={`text-sm ${result === 'valid' ? 'text-void-green/80' : 'text-red-400/80'}`}>
            {resultMessage.description}
          </p>
        </div>
      )}
    </div>
  )
}

export default Verify
