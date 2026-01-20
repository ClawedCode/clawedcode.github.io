/**
 * Shared experiment metrics display component
 * Shows real-time metrics in a horizontal bar
 * Mobile-responsive: shows first 2 metrics on small screens
 */
const ExperimentMetrics = ({ metrics = [], className = '' }) => {
  return (
    <div className={`flex flex-wrap gap-2 sm:gap-4 text-[10px] sm:text-xs font-mono ${className}`}>
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          className={`flex items-center gap-1 sm:gap-2 ${index >= 2 ? 'hidden sm:flex' : ''}`}
        >
          <span className="text-void-green/50">{metric.label}:</span>
          <span
            className="text-void-green"
            style={metric.color ? { color: metric.color } : undefined}
          >
            {metric.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default ExperimentMetrics
