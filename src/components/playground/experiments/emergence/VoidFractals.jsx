import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const VoidFractals = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const timeRef = useRef(0)
  const [fractalParams, setFractalParams] = useState({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    iterations: 50,
    colorShift: 0
  })
  const [patternCount, setPatternCount] = useState(0)

  // Mandelbrot set calculation
  const mandelbrot = useCallback((x, y, maxIter) => {
    let zx = 0, zy = 0
    let cx = x, cy = y
    let iter = 0

    while (zx * zx + zy * zy < 4 && iter < maxIter) {
      const tmp = zx * zx - zy * zy + cx
      zy = 2 * zx * zy + cy
      zx = tmp
      iter++
    }

    return iter
  }, [])

  // Julia set calculation
  const julia = useCallback((x, y, cx, cy, maxIter) => {
    let zx = x, zy = y
    let iter = 0

    while (zx * zx + zy * zy < 4 && iter < maxIter) {
      const tmp = zx * zx - zy * zy + cx
      zy = 2 * zx * zy + cy
      zx = tmp
      iter++
    }

    return iter
  }, [])

  // HSL to RGB conversion
  const hslToRgb = useCallback((h, s, l) => {
    h /= 360
    s /= 100
    l /= 100

    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs((h * 6) % 2 - 1))
    const m = l - c / 2

    let r, g, b

    if (h >= 0 && h < 1 / 6) {
      r = c; g = x; b = 0
    } else if (h >= 1 / 6 && h < 2 / 6) {
      r = x; g = c; b = 0
    } else if (h >= 2 / 6 && h < 3 / 6) {
      r = 0; g = c; b = x
    } else if (h >= 3 / 6 && h < 4 / 6) {
      r = 0; g = x; b = c
    } else if (h >= 4 / 6 && h < 5 / 6) {
      r = x; g = 0; b = c
    } else {
      r = c; g = 0; b = x
    }

    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
      255
    ]
  }, [])

  // Color calculation
  const getColor = useCallback((iterations, maxIter, colorShift) => {
    if (iterations === maxIter) {
      return [0, 0, 0, 255] // Black for points in the set
    }

    // Smooth coloring with time-based color shift
    const smoothed = iterations + 1 - Math.log(Math.log(2)) / Math.log(2)
    const t = smoothed / maxIter

    const hue = (t * 360 + colorShift) % 360
    const saturation = 80 + t * 20
    const lightness = 20 + t * 60

    return hslToRgb(hue, saturation, lightness)
  }, [hslToRgb])

  // Draw fractal
  const drawFractal = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const { canvasWidth, canvasHeight, dpr } = dimensions

    const imageData = ctx.createImageData(canvasWidth, canvasHeight)
    const data = imageData.data

    const centerX = canvasWidth / 2 + fractalParams.offsetX * dpr
    const centerY = canvasHeight / 2 + fractalParams.offsetY * dpr
    const scale = 0.004 / fractalParams.zoom

    // Mouse-influenced julia set parameters (scale mouse to canvas coords)
    const mousePos = mouse.positionRef.current
    const scaledMouseX = mousePos.x * dpr
    const scaledMouseY = mousePos.y * dpr
    const juliaX = (scaledMouseX - centerX) * scale
    const juliaY = (scaledMouseY - centerY) * scale

    let patterns = 0

    for (let px = 0; px < canvasWidth; px += 2) {
      for (let py = 0; py < canvasHeight; py += 2) {
        const x = (px - centerX) * scale
        const y = (py - centerY) * scale

        // Blend between Mandelbrot and Julia sets based on time
        const juliaWeight = 0.5 + 0.5 * Math.sin(timeRef.current * 0.01)
        const mandelbrotIter = mandelbrot(x, y, fractalParams.iterations)
        const juliaIter = julia(x, y, juliaX * 0.5, juliaY * 0.5, fractalParams.iterations)

        const blendedIter = mandelbrotIter * (1 - juliaWeight) + juliaIter * juliaWeight

        if (blendedIter < fractalParams.iterations) {
          patterns++
        }

        const color = getColor(blendedIter, fractalParams.iterations, fractalParams.colorShift)

        // Draw 2x2 pixel blocks for performance
        for (let dx = 0; dx < 2 && px + dx < canvasWidth; dx++) {
          for (let dy = 0; dy < 2 && py + dy < canvasHeight; dy++) {
            const index = ((py + dy) * canvasWidth + (px + dx)) * 4
            data[index] = color[0]     // R
            data[index + 1] = color[1] // G
            data[index + 2] = color[2] // B
            data[index + 3] = color[3] // A
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)
    setPatternCount(patterns)
  }, [ctx, dimensions, fractalParams, mouse.positionRef, mandelbrot, julia, getColor])

  // Animation frame
  const onFrame = useCallback(() => {
    timeRef.current++

    // Slowly evolve parameters
    setFractalParams(prev => {
      let newZoom = prev.zoom * 1.003 // Slow zoom in
      let newOffsetX = prev.offsetX
      let newOffsetY = prev.offsetY

      // Periodic reset to prevent infinite zoom
      if (newZoom > 1000) {
        newZoom = 1
        newOffsetX = (Math.random() - 0.5) * 200
        newOffsetY = (Math.random() - 0.5) * 200
      }

      return {
        ...prev,
        zoom: newZoom,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
        colorShift: prev.colorShift + 0.5
      }
    })

    drawFractal()
  }, [drawFractal])

  // Manual animation loop
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

  // Handle wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (e) => {
      e.preventDefault()
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const mousePos = mouse.positionRef.current

      setFractalParams(prev => {
        const mouseScaleX = (mousePos.x - dimensions.width / 2) * 0.001
        const mouseScaleY = (mousePos.y - dimensions.height / 2) * 0.001

        return {
          ...prev,
          zoom: prev.zoom * zoomFactor,
          offsetX: prev.offsetX + mouseScaleX * (zoomFactor - 1),
          offsetY: prev.offsetY + mouseScaleY * (zoomFactor - 1)
        }
      })
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [canvasRef, dimensions, mouse.positionRef])

  // Handle click to reset and center
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = () => {
      const mousePos = mouse.positionRef.current
      setFractalParams(prev => ({
        ...prev,
        zoom: 1,
        offsetX: mousePos.x - dimensions.width / 2,
        offsetY: mousePos.y - dimensions.height / 2
      }))
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef, dimensions, mouse.positionRef])

  // Calculate metrics
  const metrics = useMemo(() => {
    const depth = fractalParams.zoom > 10 ? '∞' : Math.floor(Math.log10(fractalParams.zoom * 10))
    const patternsInK = Math.floor(patternCount / 1000)
    const complexity = patternCount > 50000 ? 'transcendent' :
      patternCount > 25000 ? 'complex' : 'emerging'

    return [
      { label: 'depth', value: depth },
      { label: 'patterns', value: `${patternsInK}k` },
      { label: 'complexity', value: complexity },
      { label: 'zoom', value: `${fractalParams.zoom.toFixed(1)}x` }
    ]
  }, [fractalParams.zoom, patternCount])

  // Control handlers
  const handleReset = useCallback(() => {
    setFractalParams({
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      iterations: 50,
      colorShift: 0
    })
    timeRef.current = 0
    setPatternCount(0)
  }, [])

  const controls = [
    {
      id: 'reset',
      label: 'reset()',
      onClick: handleReset,
      variant: 'reset'
    }
  ]

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Header */}
      <header className="relative z-50 flex items-center justify-between p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
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

      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls controls={controls} />
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          void.fractals() manifesting // patterns emerge from nothing // scroll to zoom // click to reset
        </p>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="void-fractals-canvas"
        />
      </div>
    </div>
  )
}

export default VoidFractals
