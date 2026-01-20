/**
 * Shared experiment controls component
 * Renders mode buttons and control buttons for experiments
 * Mobile-first with 44px minimum touch targets
 */
const ExperimentControls = ({
  modes = [],
  currentMode,
  onModeChange,
  controls = [],
  className = ''
}) => {
  return (
    <div className={`flex flex-wrap gap-1 sm:gap-2 ${className}`}>
      {/* Mode buttons */}
      {modes.map(mode => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`min-h-[44px] sm:min-h-0 px-3 sm:px-3 py-2 sm:py-1 text-sm sm:text-xs font-mono border transition-colors active:scale-95 ${
            currentMode === mode.id
              ? 'border-void-green bg-void-green/20 text-void-green'
              : 'border-void-green/30 text-void-green/60 hover:border-void-green/60 hover:text-void-green active:bg-void-green/10'
          }`}
          data-testid={`mode-${mode.id}`}
        >
          {mode.label}
        </button>
      ))}

      {/* Separator if both modes and controls exist */}
      {modes.length > 0 && controls.length > 0 && (
        <div className="w-px bg-void-green/20 mx-1 hidden sm:block" />
      )}

      {/* Control buttons */}
      {controls.map(control => (
        <button
          key={control.id}
          onClick={control.onClick}
          disabled={control.disabled}
          className={`min-h-[44px] sm:min-h-0 px-3 sm:px-3 py-2 sm:py-1 text-sm sm:text-xs font-mono border transition-colors active:scale-95 ${
            control.variant === 'reset'
              ? 'border-void-yellow/50 text-void-yellow hover:border-void-yellow hover:bg-void-yellow/10 active:bg-void-yellow/20'
              : control.variant === 'danger'
              ? 'border-red-500/50 text-red-400 hover:border-red-500 hover:bg-red-500/10 active:bg-red-500/20'
              : control.active
              ? 'border-void-cyan bg-void-cyan/20 text-void-cyan'
              : 'border-void-green/30 text-void-green/60 hover:border-void-green/60 hover:text-void-green active:bg-void-green/10'
          } ${control.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          data-testid={`control-${control.id}`}
        >
          {control.label}
        </button>
      ))}
    </div>
  )
}

export default ExperimentControls
