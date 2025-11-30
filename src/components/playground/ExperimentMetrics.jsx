/**
 * Shared experiment metrics display component
 * Shows real-time metrics in a horizontal bar
 */
const ExperimentMetrics = ({ metrics = [], className = '' }) => {
  return (
    <div className={`flex flex-wrap gap-4 text-xs font-mono ${className}`}>
      {metrics.map(metric => (
        <div key={metric.label} className="flex items-center gap-2">
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
