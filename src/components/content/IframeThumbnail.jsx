import { useRef, useState, useEffect } from 'react'

const IframeThumbnail = ({ src, width, height, maxWidth, maxHeight }) => {
  const containerRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  const scale = Math.min(maxWidth / width, maxHeight / height, 1)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden bg-void-dark"
      style={{ height: maxHeight }}
    >
      {isVisible && (
        <iframe
          src={src}
          title="Content preview"
          className="absolute left-1/2 origin-top-left pointer-events-none"
          style={{
            width,
            height,
            transform: `translateX(-50%) scale(${scale})`,
          }}
        />
      )}
    </div>
  )
}

export default IframeThumbnail
