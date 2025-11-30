import { useRef, useState, useCallback, useEffect } from 'react'

/**
 * Hook for managing requestAnimationFrame lifecycle
 * @param {Function} onFrame - Callback called each frame with (time, deltaTime)
 * @param {Object} options - { autoStart: true }
 * @returns {Object} { time, isRunning, play, pause, toggle }
 */
export const useAnimationLoop = (onFrame, options = {}) => {
  const { autoStart = true } = options

  const frameRef = useRef(null)
  const timeRef = useRef(0)
  const lastTimeRef = useRef(0)
  const callbackRef = useRef(onFrame)
  const [isRunning, setIsRunning] = useState(autoStart)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onFrame
  }, [onFrame])

  const animate = useCallback((timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp
    const deltaTime = timestamp - lastTimeRef.current
    lastTimeRef.current = timestamp
    timeRef.current++

    callbackRef.current(timeRef.current, deltaTime)

    frameRef.current = requestAnimationFrame(animate)
  }, [])

  const play = useCallback(() => {
    if (frameRef.current) return
    lastTimeRef.current = 0
    frameRef.current = requestAnimationFrame(animate)
    setIsRunning(true)
  }, [animate])

  const pause = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    setIsRunning(false)
  }, [])

  const toggle = useCallback(() => {
    if (isRunning) {
      pause()
    } else {
      play()
    }
  }, [isRunning, play, pause])

  const reset = useCallback(() => {
    timeRef.current = 0
    lastTimeRef.current = 0
  }, [])

  // Auto-start and cleanup
  useEffect(() => {
    if (autoStart) play()
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [autoStart, play])

  return {
    time: timeRef.current,
    isRunning,
    play,
    pause,
    toggle,
    reset
  }
}

export default useAnimationLoop
