import { useEffect } from 'react'

const ModalViewer = ({ item, type, onClose }) => {
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
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [onClose])

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

      <div
        className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Content iframe */}
        <div className="relative" style={{ width: width * scale, height: height * scale }}>
          <iframe
            src={contentPath}
            title={`${type} ${item.id}`}
            className="w-full h-full border border-void-green/30"
            style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          />
        </div>

        {/* Info panel */}
        <div className="lg:w-80 space-y-4">
          <div className="text-void-cyan">{date}</div>
          <p className="text-void-green whitespace-pre-wrap">{item.text}</p>

          <div className="flex flex-wrap gap-2">
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
            >
              View on 𝕏
            </a>

            {type === 'mind' && item.nftUrl && (
              <a
                href={item.nftUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn border-void-cyan text-void-cyan"
              >
                View NFT
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalViewer
