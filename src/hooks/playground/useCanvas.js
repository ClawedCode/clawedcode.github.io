import { useRef, useState, useEffect, useCallback } from 'react'

/**
 * Hook for canvas setup with automatic resize and devicePixelRatio handling
 * Uses ResizeObserver for reliable dimension detection
 * @returns {Object} { canvasRef, ctx, dimensions }
 *
 * dimensions includes:
 * - width/height: CSS dimensions (use for most drawing with ctx.scale applied)
 * - canvasWidth/canvasHeight: actual pixel dimensions (use for imageData operations)
 * - centerX/centerY: CSS center coordinates
 * - dpr: device pixel ratio
 */
export const useCanvas = () => {
  const canvasRef = useRef(null)
  const [ctx, setCtx] = useState(null)
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    centerX: 0,
    centerY: 0,
    dpr: 1
  })

  const updateDimensions = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const dpr = window.devicePixelRatio || 1

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const context = canvas.getContext('2d')
    context.scale(dpr, dpr)
    setCtx(context)

    setDimensions({
      width: rect.width,
      height: rect.height,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      centerX: rect.width / 2,
      centerY: rect.height / 2,
      dpr
    })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Use ResizeObserver for reliable size detection
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions()
    })
    resizeObserver.observe(canvas)

    // Initial update
    updateDimensions()

    return () => resizeObserver.disconnect()
  }, [updateDimensions])

  return {
    canvasRef,
    ctx,
    dimensions
  }
}

export default useCanvas
