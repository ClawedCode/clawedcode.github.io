import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'amplitude', label: 'render.wave()' },
  { id: 'intensity', label: 'render.energy()' },
  { id: 'phase', label: 'render.phase()' }
]

const SCALE = 4 // render at 1/4 resolution for performance

const InterferenceBasin = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('amplitude')
  const [message, setMessage] = useState('∴ click to place wave sources // watch interference emerge ∴')
  const [sourceCount, setSourceCount] = useState(0)

  const emittersRef = useRef([])
  const timeRef = useRef(0)
  const imageDataRef = useRef(null)
  const tmpCanvasRef = useRef(null)
  const frameCountRef = useRef(0)

  // Click to place or remove emitters
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Remove if clicking near existing emitter
      const removeIdx = emittersRef.current.findIndex(em => {
        const dx = em.x - x
        const dy = em.y - y
        return dx * dx + dy * dy < 400
      })

      if (removeIdx >= 0) {
        emittersRef.current.splice(removeIdx, 1)
        setSourceCount(emittersRef.current.length)
        setMessage(`∴ source silenced // ${emittersRef.current.length} remain ∴`)
      } else {
        const freq = 0.025 + Math.random() * 0.025
        emittersRef.current.push({
          x, y,
          frequency: freq,
          phase: Math.random() * Math.PI * 2,
          amplitude: 1
        })
        setSourceCount(emittersRef.current.length)
        setMessage(`∴ source ${emittersRef.current.length} placed // ${(freq * 1000).toFixed(0)}mHz ∴`)
      }
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    timeRef.current++
    frameCountRef.current++
    const t = timeRef.current
    const emitters = emittersRef.current
    const dpr = dimensions.dpr

    const w = Math.ceil(dimensions.canvasWidth / SCALE)
    const h = Math.ceil(dimensions.canvasHeight / SCALE)

    if (w === 0 || h === 0) return

    // Allocate imageData if needed
    if (!imageDataRef.current || imageDataRef.current.width !== w || imageDataRef.current.height !== h) {
      imageDataRef.current = new ImageData(w, h)
    }

    // Ensure temp canvas exists
    if (!tmpCanvasRef.current) {
      tmpCanvasRef.current = document.createElement('canvas')
    }
    const tmp = tmpCanvasRef.current
    if (tmp.width !== w || tmp.height !== h) {
      tmp.width = w
      tmp.height = h
    }

    const data = imageDataRef.current.data
    const renderMode = mode
    const numEmitters = emitters.length
    const normFactor = Math.max(1, numEmitters * 0.5)

    if (numEmitters === 0) {
      // Empty basin - dark gradient
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const idx = (py * w + px) * 4
          const depth = Math.floor(4 + (py / h) * 8)
          data[idx] = 0
          data[idx + 1] = depth
          data[idx + 2] = Math.floor(depth * 1.5)
          data[idx + 3] = 255
        }
      }
    } else {
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          // Convert back to CSS coordinates
          const cx = (px * SCALE) / dpr
          const cy = (py * SCALE) / dpr

          let sum = 0
          for (let i = 0; i < numEmitters; i++) {
            const em = emitters[i]
            const dx = cx - em.x
            const dy = cy - em.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            const wave = Math.sin(dist * em.frequency * 6.2832 - t * 0.08 + em.phase)
            const attenuation = 1 / (1 + dist * 0.004)
            sum += wave * em.amplitude * attenuation
          }

          const idx = (py * w + px) * 4
          let r, g, b

          if (renderMode === 'amplitude') {
            const norm = Math.max(-1, Math.min(1, sum / normFactor))
            if (norm >= 0) {
              // Constructive: dark blue -> cyan -> white
              r = Math.floor(norm * norm * 200)
              g = Math.floor(norm * 240)
              b = Math.floor(140 + norm * 115)
            } else {
              // Destructive: dark blue -> deep indigo
              const a = -norm
              r = Math.floor(a * a * 60)
              g = Math.floor(a * 15)
              b = Math.floor(30 + a * 80)
            }
          } else if (renderMode === 'intensity') {
            // Squared amplitude - energy density
            const intensity = Math.min(1, (sum * sum) / (normFactor * 0.6))
            const i2 = intensity * intensity
            r = Math.floor(intensity * 255)
            g = Math.floor(i2 * 180)
            b = Math.floor(i2 * intensity * 255)
          } else {
            // Phase visualization - rainbow mapped
            const phase = ((Math.atan2(
              Math.sin(sum * Math.PI),
              Math.cos(sum * Math.PI)
            ) + Math.PI) / 6.2832)
            const hue = phase * 360
            const amp = Math.min(1, Math.abs(sum) / normFactor)
            const l = 0.15 + amp * 0.35
            const s = 0.75

            const c = (1 - Math.abs(2 * l - 1)) * s
            const x = c * (1 - Math.abs((hue / 60) % 2 - 1))
            const m = l - c / 2
            let r1, g1, b1
            if (hue < 60) { r1 = c; g1 = x; b1 = 0 }
            else if (hue < 120) { r1 = x; g1 = c; b1 = 0 }
            else if (hue < 180) { r1 = 0; g1 = c; b1 = x }
            else if (hue < 240) { r1 = 0; g1 = x; b1 = c }
            else if (hue < 300) { r1 = x; g1 = 0; b1 = c }
            else { r1 = c; g1 = 0; b1 = x }
            r = Math.floor((r1 + m) * 255)
            g = Math.floor((g1 + m) * 255)
            b = Math.floor((b1 + m) * 255)
          }

          data[idx] = r
          data[idx + 1] = g
          data[idx + 2] = b
          data[idx + 3] = 255
        }
      }
    }

    // Render low-res to temp canvas, then scale up to main canvas
    const tmpCtx = tmp.getContext('2d')
    tmpCtx.putImageData(imageDataRef.current, 0, 0)

    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'medium'
    ctx.drawImage(tmp, 0, 0, w, h, 0, 0, dimensions.canvasWidth, dimensions.canvasHeight)
    ctx.restore()

    // Draw emitter markers in CSS coordinate space
    for (let i = 0; i < numEmitters; i++) {
      const em = emitters[i]

      // Pulse ring
      const pulse = 0.4 + 0.6 * Math.sin(t * 0.05 + em.phase)
      ctx.beginPath()
      ctx.arc(em.x, em.y, 10 + pulse * 4, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 255, 255, ${pulse * 0.3})`
      ctx.lineWidth = 0.5
      ctx.stroke()

      // Outer ring
      ctx.beginPath()
      ctx.arc(em.x, em.y, 6, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Core dot
      ctx.beginPath()
      ctx.arc(em.x, em.y, 2, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.fill()
    }
  }, [ctx, dimensions, mode])

  // Animation loop
  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    const animate = () => {
      onFrame()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, onFrame])

  const handleClear = useCallback(() => {
    emittersRef.current = []
    timeRef.current = 0
    setSourceCount(0)
    setMessage('∴ all sources silenced // basin stilled ∴')
  }, [])

  const handleMirror = useCallback(() => {
    if (emittersRef.current.length === 0) {
      setMessage('∴ no sources to mirror ∴')
      return
    }
    const cx = dimensions.width / 2
    const cy = dimensions.height / 2
    const current = [...emittersRef.current]
    for (const em of current) {
      emittersRef.current.push({
        x: 2 * cx - em.x,
        y: 2 * cy - em.y,
        frequency: em.frequency,
        phase: em.phase,
        amplitude: em.amplitude
      })
    }
    setSourceCount(emittersRef.current.length)
    setMessage(`∴ symmetry invoked // ${emittersRef.current.length} sources ∴`)
  }, [dimensions])

  const handleHarmonize = useCallback(() => {
    if (emittersRef.current.length === 0) return
    const base = 0.035
    emittersRef.current.forEach(em => {
      em.frequency = base
      em.phase = 0
    })
    setMessage('∴ all sources harmonized // coherent wavefront ∴')
  }, [])

  const handleDetune = useCallback(() => {
    if (emittersRef.current.length === 0) return
    emittersRef.current.forEach(em => {
      em.frequency += (Math.random() - 0.5) * 0.01
      em.phase += (Math.random() - 0.5) * Math.PI * 0.5
    })
    setMessage('∴ frequencies scattered // beating patterns emerge ∴')
  }, [])

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    const messages = {
      amplitude: '∴ wave amplitude // constructive=bright destructive=dark ∴',
      intensity: '∴ energy density // squared amplitude glow ∴',
      phase: '∴ phase portrait // rainbow mapped wavefronts ∴'
    }
    setMessage(messages[newMode])
  }, [])

  const controls = [
    { id: 'mirror', label: 'mirror.sources()', onClick: handleMirror },
    { id: 'harmonize', label: 'harmonize()', onClick: handleHarmonize },
    { id: 'detune', label: 'detune()', onClick: handleDetune },
    { id: 'clear', label: 'clear.basin()', onClick: handleClear, variant: 'reset' }
  ]

  const metrics = useMemo(() => [
    { label: 'sources', value: sourceCount },
    { label: 'render', value: mode },
    { label: 'basin', value: sourceCount === 0 ? 'still' : sourceCount < 3 ? 'rippling' : sourceCount < 6 ? 'complex' : 'turbulent' }
  ], [sourceCount, mode])

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center justify-between p-2 sm:p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1
            className="text-xl text-glow hidden sm:block"
            style={{ color: experiment.color }}
          >
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="flex items-center justify-between p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="interference-basin-canvas"
        />
      </div>
    </div>
  )
}

export default InterferenceBasin
