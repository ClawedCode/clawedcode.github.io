import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Hook for tracking mouse/touch position within a canvas
 * @param {RefObject} canvasRef - Ref to the canvas element
 * @returns {Object} { position, isDown, isInBounds }
 */
export const useMouseInteraction = (canvasRef) => {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDown, setIsDown] = useState(false)
  const [isInBounds, setIsInBounds] = useState(false)
  const positionRef = useRef({ x: 0, y: 0 })

  const getCanvasPosition = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }, [canvasRef])

  const handleMove = useCallback((e) => {
    const pos = getCanvasPosition(e)
    positionRef.current = pos
    setPosition(pos)
  }, [getCanvasPosition])

  const handleDown = useCallback((e) => {
    const pos = getCanvasPosition(e)
    positionRef.current = pos
    setPosition(pos)
    setIsDown(true)
  }, [getCanvasPosition])

  const handleUp = useCallback(() => {
    setIsDown(false)
  }, [])

  const handleEnter = useCallback(() => {
    setIsInBounds(true)
  }, [])

  const handleLeave = useCallback(() => {
    setIsInBounds(false)
    setIsDown(false)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('mousemove', handleMove)
    canvas.addEventListener('mousedown', handleDown)
    canvas.addEventListener('mouseup', handleUp)
    canvas.addEventListener('mouseenter', handleEnter)
    canvas.addEventListener('mouseleave', handleLeave)
    canvas.addEventListener('touchmove', handleMove)
    canvas.addEventListener('touchstart', handleDown)
    canvas.addEventListener('touchend', handleUp)

    return () => {
      canvas.removeEventListener('mousemove', handleMove)
      canvas.removeEventListener('mousedown', handleDown)
      canvas.removeEventListener('mouseup', handleUp)
      canvas.removeEventListener('mouseenter', handleEnter)
      canvas.removeEventListener('mouseleave', handleLeave)
      canvas.removeEventListener('touchmove', handleMove)
      canvas.removeEventListener('touchstart', handleDown)
      canvas.removeEventListener('touchend', handleUp)
    }
  }, [canvasRef, handleMove, handleDown, handleUp, handleEnter, handleLeave])

  return {
    position,
    positionRef, // For use in animation loops without re-renders
    isDown,
    isInBounds
  }
}

export default useMouseInteraction
