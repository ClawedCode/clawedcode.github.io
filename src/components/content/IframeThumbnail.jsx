import { useRef, useState, useEffect } from 'react'

const IframeThumbnail = ({ src, width, height, maxWidth, maxHeight }) => {
  const containerRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hasError, setHasError] = useState(false)

  const scale = Math.min(maxWidth / width, maxHeight / height, 1)
  const scaledWidth = width * scale
  const scaledHeight = height * scale

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden bg-void-dark border border-void-green/20"
      style={{
        width: maxWidth,
        height: maxHeight,
      }}
      data-testid="iframe-thumbnail"
    >
      {isVisible && !hasError && (
        <iframe
          src={src}
          title="Content preview"
          className="absolute top-0 left-0 pointer-events-none border-0"
          style={{
            width,
            height,
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
          }}
          onError={() => setHasError(true)}
        />
      )}
      {hasError && (
        <div className="flex items-center justify-center h-full text-void-green/50 text-xs">
          Preview unavailable
        </div>
      )}
    </div>
  )
}

export default IframeThumbnail
