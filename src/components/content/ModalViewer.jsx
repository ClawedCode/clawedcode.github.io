import { useEffect } from 'react'
import { Tweet } from 'react-tweet'

// Shorten a URL for display, keeping domain and truncated path
const shortenUrl = (url) => {
  const match = url.match(/^(https?:\/\/[^/]+)(\/.*)?$/)
  if (!match) return url
  const domain = match[1]
  const path = match[2] || ''
  if (path.length <= 10) return url
  return `${domain}${path.slice(0, 8)}...`
}

// Parse text and convert URLs to clickable shortened links
const TextWithLinks = ({ text }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)

  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      // Reset regex lastIndex after test
      urlRegex.lastIndex = 0
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-void-cyan hover:underline"
        >
          {shortenUrl(part)}
        </a>
      )
    }
    return part
  })
}

const ModalViewer = ({ item, type, onClose, onPrev, onNext, hasPrev, hasNext }) => {
  const width = item.dimensions?.width || 1080
  const height = item.dimensions?.height || 1350
  const tweetUrl = `https://x.com/ClawedCode/status/${item.id}`
  const contentPath = type === 'report'
    ? `/reports/${item.id}.html`
    : `/mind/${item.id}/index.html`

  const date = new Date(item.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onPrev()
      if (e.key === 'ArrowRight' && hasNext) onNext()
    }
    document.addEventListener('keydown', handleKeydown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeydown)
      document.body.style.overflow = ''
    }
  }, [onClose, onPrev, onNext, hasPrev, hasNext])

  // Calculate scale to fit viewport
  const maxWidth = window.innerWidth * 0.9
  const maxHeight = window.innerHeight * 0.8
  const scale = Math.min(maxWidth / width, maxHeight / height, 1)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void-dark/95"
      onClick={onClose}
      data-testid="modal-overlay"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-void-green hover:text-void-cyan text-2xl"
        data-testid="modal-close"
      >
        ×
      </button>

      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-void-green hover:text-void-cyan text-4xl px-2 cursor-pointer"
          data-testid="modal-prev"
        >
          ‹
        </button>
      )}

      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext() }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-void-green hover:text-void-cyan text-4xl px-2 cursor-pointer"
          data-testid="modal-next"
        >
          ›
        </button>
      )}

      <div
        className="flex flex-col lg:flex-row gap-8 mx-4 lg:mx-16"
        onClick={e => e.stopPropagation()}
      >
        {/* Content iframe */}
        <div className="relative shrink-0" style={{ width: width * scale, height: height * scale }}>
          <iframe
            src={contentPath}
            title={`${type} ${item.id}`}
            className="w-full h-full border border-void-green/30"
            style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          />
        </div>

        {/* Info panel - taller than iframe to fit source tweet without scroll */}
        <div className="flex-1 min-w-[320px] max-w-[500px] space-y-4 overflow-y-auto max-h-[95vh] font-mono">
          <div className="text-void-cyan text-sm">{date}</div>

          <p className="text-void-green whitespace-pre-wrap text-sm leading-relaxed font-mono">
            <TextWithLinks text={item.text} />
          </p>

          <div className="flex flex-wrap gap-2">
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn text-sm"
            >
              View on 𝕏
            </a>

            {type === 'mind' && item.nftUrl && (
              <a
                href={item.nftUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn border-void-cyan text-void-cyan text-sm"
              >
                View NFT
              </a>
            )}
          </div>

          {/* Source tweet embed - only show for replies/quotes */}
          {item.source && (
            <div className="border border-void-green/30 rounded p-3" data-testid="source-tweet">
              <div className="text-xs text-void-cyan mb-2 font-mono">
                {item.source.type === 'quote' ? 'Quoting' : 'Replying to'} @{item.source.author}
              </div>
              <div data-theme="dark" className="react-tweet-container">
                <Tweet id={item.source.postId} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ModalViewer
