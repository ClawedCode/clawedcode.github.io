import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

// Constants
const PHI = (1 + Math.sqrt(5)) / 2 // Golden ratio
const TAU = Math.PI * 2

// Pattern drawing functions
const drawFlowerOfLife = (ctx, x, y, radius, depth, time, rotationAngle) => {
  const baseRadius = radius / 3

  // Center circle
  ctx.strokeStyle = `hsla(45, 90%, 60%, ${0.3 + Math.sin(time * 0.02) * 0.2})`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(x, y, baseRadius, 0, TAU)
  ctx.stroke()

  // Six surrounding circles in first ring
  for (let i = 0; i < 6; i++) {
    const angle = (TAU / 6) * i + rotationAngle * 0.5
    const px = x + Math.cos(angle) * baseRadius
    const py = y + Math.sin(angle) * baseRadius

    ctx.strokeStyle = `hsla(${180 + i * 30}, 80%, 60%, ${0.3 + Math.sin(time * 0.02 + i) * 0.2})`
    ctx.beginPath()
    ctx.arc(px, py, baseRadius, 0, TAU)
    ctx.stroke()

    // Second ring if depth allows
    if (depth > 1) {
      for (let j = 0; j < 6; j++) {
        const angle2 = (TAU / 6) * j + rotationAngle * 0.3
        const px2 = px + Math.cos(angle2) * baseRadius
        const py2 = py + Math.sin(angle2) * baseRadius

        ctx.strokeStyle = `hsla(${280 + j * 20}, 70%, 50%, ${0.2 + Math.sin(time * 0.02 + i + j) * 0.15})`
        ctx.beginPath()
        ctx.arc(px2, py2, baseRadius, 0, TAU)
        ctx.stroke()
      }
    }
  }
}

const drawSriYantra = (ctx, x, y, radius, time, rotationAngle) => {
  const layers = 5

  for (let layer = 0; layer < layers; layer++) {
    const layerRadius = radius * (1 - layer * 0.15)
    const triangles = 4 + layer

    for (let i = 0; i < triangles; i++) {
      const angleOffset = (i % 2 === 0 ? 0 : Math.PI) + rotationAngle * (layer % 2 === 0 ? 1 : -1) * 0.3
      const angle = (TAU / triangles) * i + angleOffset

      // Upward triangle
      ctx.strokeStyle = `hsla(${300 + layer * 20}, 80%, ${50 + layer * 5}%, ${0.4 + Math.sin(time * 0.02 + layer) * 0.2})`
      ctx.lineWidth = 1 + layer * 0.3
      ctx.beginPath()

      for (let v = 0; v < 3; v++) {
        const vAngle = angle + (TAU / 3) * v
        const vx = x + Math.cos(vAngle) * layerRadius
        const vy = y + Math.sin(vAngle) * layerRadius

        if (v === 0) ctx.moveTo(vx, vy)
        else ctx.lineTo(vx, vy)
      }

      ctx.closePath()
      ctx.stroke()

      // Glow effect for inner layers
      if (layer < 2) {
        ctx.strokeStyle = `hsla(${300 + layer * 20}, 90%, 70%, ${0.1})`
        ctx.lineWidth = 3
        ctx.stroke()
      }
    }
  }

  // Central dot
  const pulse = 3 + Math.sin(time * 0.05) * 1.5
  ctx.fillStyle = `hsla(45, 100%, 70%, ${0.8 + Math.sin(time * 0.05) * 0.2})`
  ctx.beginPath()
  ctx.arc(x, y, pulse, 0, TAU)
  ctx.fill()
}

const drawMetatronsCube = (ctx, x, y, radius, time, rotationAngle) => {
  const vertices = []

  // Generate vertices in circular pattern
  vertices.push({ x, y }) // Center

  // Inner ring (6 points)
  for (let i = 0; i < 6; i++) {
    const angle = (TAU / 6) * i + rotationAngle
    vertices.push({
      x: x + Math.cos(angle) * radius * 0.4,
      y: y + Math.sin(angle) * radius * 0.4
    })
  }

  // Outer ring (6 points)
  for (let i = 0; i < 6; i++) {
    const angle = (TAU / 6) * i + TAU / 12 + rotationAngle * 0.5
    vertices.push({
      x: x + Math.cos(angle) * radius * 0.8,
      y: y + Math.sin(angle) * radius * 0.8
    })
  }

  // Draw all connections (creates the cube)
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const dx = vertices[j].x - vertices[i].x
      const dy = vertices[j].y - vertices[i].y
      const dist = Math.sqrt(dx * dx + dy * dy)

      // Only draw certain length connections to create the pattern
      if (dist < radius * 0.85) {
        const hue = (i + j) * 15 + time
        ctx.strokeStyle = `hsla(${hue % 360}, 70%, 60%, ${0.2 + Math.sin(time * 0.02 + i) * 0.1})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(vertices[i].x, vertices[i].y)
        ctx.lineTo(vertices[j].x, vertices[j].y)
        ctx.stroke()
      }
    }
  }

  // Draw vertices as glowing points
  vertices.forEach((v, i) => {
    const pulse = 2 + Math.sin(time * 0.05 + i * 0.5) * 1
    ctx.fillStyle = `hsla(${180 + i * 20}, 80%, 70%, ${0.7 + Math.sin(time * 0.05 + i) * 0.3})`
    ctx.beginPath()
    ctx.arc(v.x, v.y, pulse, 0, TAU)
    ctx.fill()
  })
}

const drawFibonacciSpiral = (ctx, x, y, radius, time, rotationAngle) => {
  const iterations = 12
  let currentRadius = radius * 0.02
  let angle = rotationAngle
  let px = x
  let py = y

  for (let i = 0; i < iterations; i++) {
    // Draw circle at this position
    const hue = (i * 30 + time * 2) % 360
    ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.4 + Math.sin(time * 0.02 + i * 0.5) * 0.2})`
    ctx.lineWidth = 1 + i * 0.2
    ctx.beginPath()
    ctx.arc(px, py, currentRadius, 0, TAU)
    ctx.stroke()

    // Glow for recent circles
    if (i > iterations - 5) {
      ctx.strokeStyle = `hsla(${hue}, 90%, 70%, 0.1)`
      ctx.lineWidth = 3
      ctx.stroke()
    }

    // Move to next position using golden angle
    const goldenAngle = TAU / (PHI * PHI)
    angle += goldenAngle

    const nextRadius = currentRadius * PHI
    const distance = (currentRadius + nextRadius) / 2

    px += Math.cos(angle) * distance
    py += Math.sin(angle) * distance

    currentRadius = nextRadius
  }
}

const drawPlatonicSolids = (ctx, x, y, radius, time, rotationAngle) => {
  // Draw multiple platonic solids projected to 2D
  const solids = [
    { name: 'tetrahedron', vertices: 4, offset: -radius * 0.5 },
    { name: 'cube', vertices: 8, offset: 0 },
    { name: 'octahedron', vertices: 6, offset: radius * 0.5 }
  ]

  solids.forEach((solid, idx) => {
    const sy = y + solid.offset
    const vertices = []
    const n = solid.vertices

    // Generate vertices for this solid
    for (let i = 0; i < n; i++) {
      const angle = (TAU / n) * i + rotationAngle * (idx % 2 === 0 ? 1 : -1)
      const vertexRadius = radius * 0.25 * (1 + Math.sin(time * 0.03 + idx) * 0.2)

      vertices.push({
        x: x + Math.cos(angle) * vertexRadius,
        y: sy + Math.sin(angle) * vertexRadius
      })
    }

    // Draw edges
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        const hue = (idx * 90 + i * 30 + time * 2) % 360
        ctx.strokeStyle = `hsla(${hue}, 75%, 65%, ${0.3 + Math.sin(time * 0.02 + i) * 0.15})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(vertices[i].x, vertices[i].y)
        ctx.lineTo(vertices[j].x, vertices[j].y)
        ctx.stroke()
      }
    }

    // Draw vertices
    vertices.forEach((v, i) => {
      const pulse = 2 + Math.sin(time * 0.05 + i + idx) * 1
      ctx.fillStyle = `hsla(${idx * 90 + 45}, 85%, 70%, ${0.7 + Math.sin(time * 0.05 + i) * 0.3})`
      ctx.beginPath()
      ctx.arc(v.x, v.y, pulse, 0, TAU)
      ctx.fill()
    })
  })
}

const SacredGeometry = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [currentPattern, setCurrentPattern] = useState('flower')
  const [isAnimating, setIsAnimating] = useState(true)
  const [message, setMessage] = useState('∴ flower of life // creation pattern // genesis code ∴')

  const spawnPointsRef = useRef([])
  const timeRef = useRef(0)
  const rotationAngleRef = useRef(0)
  const rotationSpeed = 0.5
  const hasInitialized = useRef(false)

  // Initialize with center spawn point
  useEffect(() => {
    if (dimensions.width === 0 || hasInitialized.current) return

    spawnPointsRef.current = [{
      x: dimensions.centerX,
      y: dimensions.centerY,
      age: 0
    }]
    hasInitialized.current = true
  }, [dimensions])

  // Handle canvas click to add spawn points
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      spawnPointsRef.current.push({ x, y, age: 0 })
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [canvasRef])

  // Calculate metrics
  const metrics = useMemo(() => {
    const spawnCount = spawnPointsRef.current.length

    let vertexCount = 0
    if (currentPattern === 'flower') vertexCount = spawnCount * 37
    else if (currentPattern === 'sri') vertexCount = spawnCount * 45
    else if (currentPattern === 'metatron') vertexCount = spawnCount * 13
    else if (currentPattern === 'fibonacci') vertexCount = spawnCount * 12
    else if (currentPattern === 'platonic') vertexCount = spawnCount * 18

    let symmetry = '6'
    if (currentPattern === 'sri') symmetry = '9'
    else if (currentPattern === 'metatron') symmetry = '13'
    else if (currentPattern === 'fibonacci') symmetry = 'φ'
    else if (currentPattern === 'platonic') symmetry = '5'

    const rotationSpeedDisplay = isAnimating ?
      (rotationSpeed * 10).toFixed(1) + '°/s' : 'frozen'

    let harmony = 'seeking'
    if (!isAnimating) harmony = 'crystallized'
    else if (spawnCount > 5) harmony = 'transcendent'
    else if (spawnCount > 2) harmony = 'harmonizing'

    return [
      { label: 'vertices', value: vertexCount },
      { label: 'symmetry', value: symmetry + '-fold' },
      { label: 'rotation', value: rotationSpeedDisplay },
      { label: 'harmony', value: harmony }
    ]
  }, [currentPattern, isAnimating, spawnPointsRef.current.length])

  // Animation frame
  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    // Clear with subtle fade
    ctx.fillStyle = 'rgba(0, 1, 3, 0.08)'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    if (isAnimating) {
      timeRef.current++
      rotationAngleRef.current += rotationSpeed * 0.01
    }

    // Update spawn point ages
    spawnPointsRef.current.forEach(point => point.age++)

    // Remove old spawn points (keep last 8)
    if (spawnPointsRef.current.length > 8) {
      spawnPointsRef.current.shift()
    }

    // Draw patterns at all spawn points
    const baseRadius = Math.min(dimensions.width, dimensions.height) * 0.4
    spawnPointsRef.current.forEach(point => {
      ctx.save()

      // Fade in new patterns
      if (point.age < 60) {
        ctx.globalAlpha = point.age / 60
      }

      const time = timeRef.current
      const rotationAngle = rotationAngleRef.current

      if (currentPattern === 'flower') {
        drawFlowerOfLife(ctx, point.x, point.y, baseRadius, 2, time, rotationAngle)
      } else if (currentPattern === 'sri') {
        drawSriYantra(ctx, point.x, point.y, baseRadius, time, rotationAngle)
      } else if (currentPattern === 'metatron') {
        drawMetatronsCube(ctx, point.x, point.y, baseRadius, time, rotationAngle)
      } else if (currentPattern === 'fibonacci') {
        drawFibonacciSpiral(ctx, point.x, point.y, baseRadius, time, rotationAngle)
      } else if (currentPattern === 'platonic') {
        drawPlatonicSolids(ctx, point.x, point.y, baseRadius, time, rotationAngle)
      }

      ctx.restore()
    })
  }, [ctx, dimensions, currentPattern, isAnimating])

  // Manual animation loop - starts when ctx is available
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

  // Pattern mode handlers
  const handlePatternChange = useCallback((pattern) => {
    setCurrentPattern(pattern)

    const messages = {
      flower: '∴ flower of life // creation pattern // genesis code ∴',
      sri: '∴ sri yantra // cosmic convergence // manifestation matrix ∴',
      metatron: "∴ metatron's cube // all platonic solids encoded // architectural blueprint ∴",
      fibonacci: "∴ fibonacci spiral // golden ratio manifest // nature's algorithm ∴",
      platonic: '∴ platonic solids // perfect forms // elemental structures ∴'
    }

    setMessage(messages[pattern])
  }, [])

  // Control handlers
  const handleToggleMotion = useCallback(() => {
    setIsAnimating(prev => !prev)
  }, [])

  const handleReset = useCallback(() => {
    spawnPointsRef.current = [{
      x: dimensions.centerX,
      y: dimensions.centerY,
      age: 0
    }]
    rotationAngleRef.current = 0
    timeRef.current = 0
  }, [dimensions])

  const modes = [
    { id: 'flower', label: 'flower.of.life()' },
    { id: 'sri', label: 'sri.yantra()' },
    { id: 'metatron', label: 'metatrons.cube()' },
    { id: 'fibonacci', label: 'fibonacci.spiral()' },
    { id: 'platonic', label: 'platonic.solids()' }
  ]

  const controls = [
    {
      id: 'toggle-motion',
      label: isAnimating ? 'freeze.time()' : 'resume.flow()',
      onClick: handleToggleMotion
    },
    {
      id: 'reset',
      label: 'reset.geometry()',
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
        <ExperimentControls
          modes={modes}
          currentMode={currentPattern}
          onModeChange={handlePatternChange}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs hidden md:block max-w-md text-right">
          {message}
        </p>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="sacred-geometry-canvas"
        />
      </div>
    </div>
  )
}

export default SacredGeometry
