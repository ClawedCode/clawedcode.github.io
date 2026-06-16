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
    <div className={`flex flex-wrap gap-2 sm:gap-3 ${className}`}>
      {/* Mode buttons */}
      {modes.map(mode => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`min-w-[44px] min-h-[44px] rounded-full px-4 py-3 text-sm font-mono tracking-[0.02em] border backdrop-blur-md shadow-[0_0_18px_rgba(0,0,0,0.22)] transition-[color,border-color,background-color,transform,box-shadow] active:scale-95 ${
            currentMode === mode.id
              ? 'border-void-green/80 bg-void-green/18 text-void-green shadow-[0_0_20px_rgba(51,255,51,0.18)]'
              : 'border-void-green/25 bg-void-dark/58 text-void-green/75 hover:border-void-cyan/45 hover:bg-void-cyan/10 hover:text-void-cyan active:bg-void-green/12'
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
          className={`min-w-[44px] min-h-[44px] rounded-full px-4 py-3 text-sm font-mono tracking-[0.02em] border backdrop-blur-md shadow-[0_0_18px_rgba(0,0,0,0.22)] transition-[color,border-color,background-color,transform,box-shadow] active:scale-95 ${
            control.variant === 'reset'
              ? 'border-void-yellow/55 bg-void-dark/58 text-void-yellow hover:border-void-yellow hover:bg-void-yellow/12 active:bg-void-yellow/18'
              : control.variant === 'danger'
              ? 'border-red-500/55 bg-void-dark/58 text-red-400 hover:border-red-500 hover:bg-red-500/12 active:bg-red-500/18'
              : control.active
              ? 'border-void-cyan/75 bg-void-cyan/18 text-void-cyan shadow-[0_0_20px_rgba(102,255,204,0.16)]'
              : 'border-void-green/25 bg-void-dark/58 text-void-green/75 hover:border-void-cyan/45 hover:bg-void-cyan/10 hover:text-void-cyan active:bg-void-green/12'
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
