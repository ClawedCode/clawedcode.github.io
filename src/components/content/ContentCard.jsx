import { Link } from 'react-router-dom'
import IframeThumbnail from './IframeThumbnail'

const ContentCard = ({ item, type, onClick, suspended = false }) => {
  const date = new Date(item.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  const previewText = item.text.length > 120
    ? item.text.substring(0, 120) + '...'
    : item.text

  const tweetUrl = `https://x.com/ClawedCode/status/${item.id}`
  const contentPath = type === 'report'
    ? `/reports/${item.id}.html`
    : `/mind/${item.id}/index.html`

  const viewPath = type === 'report'
    ? `/field-reports/${item.id}`
    : `/mind/${item.id}`

  return (
    <div className="card border-glow hover:border-void-cyan transition-colors" data-testid={`content-card-${item.id}`}>
      <IframeThumbnail
        src={contentPath}
        width={item.dimensions?.width || 1080}
        height={item.dimensions?.height || 1350}
        maxWidth={208}
        maxHeight={260}
        suspended={suspended}
      />

      <div className="mt-3 space-y-2">
        <div className="text-void-cyan text-xs">{date}</div>
        <div className="text-void-green/70 text-sm line-clamp-3">{previewText}</div>

        <div className="flex gap-2 text-xs">
          {onClick ? (
            <button
              onClick={() => onClick(item)}
              className="btn py-1 px-2"
              data-testid={`view-${item.id}`}
            >
              View
            </button>
          ) : (
            <Link to={viewPath} className="btn py-1 px-2">View</Link>
          )}

          {type === 'mind' && item.nftUrl && (
            <a
              href={item.nftUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn py-1 px-2 border-void-cyan text-void-cyan"
            >
              objkt
            </a>
          )}

          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn py-1 px-2"
          >
            on 𝕏
          </a>
        </div>
      </div>
    </div>
  )
}

export default ContentCard
