import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'ray', label: 'view.raywalk()' },
  { id: 'survey', label: 'view.cartograph()' },
  { id: 'glyph', label: 'view.glyphscan()' }
]

const MAP_SIZE = 27
const FOV = Math.PI / 2.8
const MAX_DEPTH = 22
const STEP = 0.035

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

const RayCatacombs = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('ray')
  const [fogEnabled, setFogEnabled] = useState(true)
  const [isRecording, setIsRecording] = useState(true)
  const [message, setMessage] = useState('∴ WASD/arrow keys to roam • Q/E to pivot • space for echo sweep ∴')
  const [stats, setStats] = useState({
    distance: 0,
    discovered: 0,
    scribes: 0,
    echoes: 0
  })

  const mapRef = useRef({ width: MAP_SIZE, height: MAP_SIZE, cells: [], seen: [], glyphs: [], floorCount: 1 })
  const playerRef = useRef({ x: 2.5, y: 2.5, angle: Math.PI / 4 })
  const keyRef = useRef({ forward: false, backward: false, left: false, right: false, turnLeft: false, turnRight: false })
  const pathRef = useRef([])
  const pulsesRef = useRef([])
  const markersRef = useRef([])
  const discoveryRef = useRef({ seen: 0, total: 1 })
  const statsRef = useRef({ distance: 0, discovered: 0, scribes: 0, echoes: 0 })
  const frameCounterRef = useRef(0)
  const lastRecordRef = useRef(0)
  const markLatchRef = useRef(false)

  const carveCatacomb = useCallback(() => {
    const width = MAP_SIZE
    const height = MAP_SIZE
    const cells = Array.from({ length: height }, () => Array(width).fill(1))
    const seen = Array.from({ length: height }, () => Array(width).fill(false))
    const glyphs = Array.from({ length: height }, () => Array(width).fill(0))

    const carve = (x, y) => {
      cells[y][x] = 0
      glyphs[y][x] = Math.random()
    }

    const stack = [{ x: 1, y: 1 }]
    carve(1, 1)

    const directions = [
      { dx: 2, dy: 0 },
      { dx: -2, dy: 0 },
      { dx: 0, dy: 2 },
      { dx: 0, dy: -2 }
    ]

    while (stack.length) {
      const current = stack[stack.length - 1]
      const candidates = directions.filter(dir => {
        const nx = current.x + dir.dx
        const ny = current.y + dir.dy
        return nx > 0 && ny > 0 && nx < width - 1 && ny < height - 1 && cells[ny][nx] === 1
      })

      if (!candidates.length) {
        stack.pop()
        continue
      }

      const dir = candidates[Math.floor(Math.random() * candidates.length)]
      const betweenX = current.x + dir.dx / 2
      const betweenY = current.y + dir.dy / 2
      carve(betweenX, betweenY)
      const nx = current.x + dir.dx
      const ny = current.y + dir.dy
      carve(nx, ny)
      stack.push({ x: nx, y: ny })
    }

    // add loops and small chambers
    for (let i = 0; i < width * height * 0.09; i++) {
      const rx = 1 + Math.floor(Math.random() * (width - 2))
      const ry = 1 + Math.floor(Math.random() * (height - 2))
      if (cells[ry][rx] === 1 && Math.random() < 0.55) {
        carve(rx, ry)
      }
    }

    let start = { x: 1, y: 1 }
    let minDist = Infinity
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (cells[y][x] !== 0) continue
        const dist = Math.abs(x - width / 2) + Math.abs(y - height / 2)
        if (dist < minDist) {
          minDist = dist
          start = { x, y }
        }
      }
    }

    const floorCount = cells.reduce((total, row) => total + row.filter(cell => cell === 0).length, 0)
    mapRef.current = { width, height, cells, seen, glyphs, floorCount }
    playerRef.current = { x: start.x + 0.5, y: start.y + 0.5, angle: Math.random() * Math.PI * 2 }
    pathRef.current = []
    pulsesRef.current = []
    markersRef.current = []
    discoveryRef.current = { seen: 0, total: Math.max(1, floorCount) }
    statsRef.current = { distance: 0, discovered: 0, scribes: 0, echoes: 0 }
    setStats({ ...statsRef.current })
    setMessage('∴ catacombs rewoven • roam with intent ∴')
  }, [setStats])

  useEffect(() => {
    if (dimensions.width === 0) return
    carveCatacomb()
  }, [carveCatacomb, dimensions.width])

  const revealAt = useCallback((px, py, radius) => {
    const map = mapRef.current
    const minX = Math.floor(px - radius)
    const maxX = Math.ceil(px + radius)
    const minY = Math.floor(py - radius)
    const maxY = Math.ceil(py + radius)
    for (let y = minY; y <= maxY; y++) {
      if (y < 0 || y >= map.height) continue
      for (let x = minX; x <= maxX; x++) {
        if (x < 0 || x >= map.width) continue
        if (map.cells[y][x] !== 0) continue
        if (!map.seen[y][x]) {
          map.seen[y][x] = true
          discoveryRef.current.seen++
          statsRef.current.discovered = Math.round((discoveryRef.current.seen / discoveryRef.current.total) * 100)
        }
      }
    }
  }, [])

  const deployEcho = useCallback(() => {
    pulsesRef.current.push({
      x: playerRef.current.x,
      y: playerRef.current.y,
      radius: 0.2,
      life: 1
    })
    statsRef.current.echoes += 1
    setMessage('∴ echo sweep cast • listening for hidden chambers ∴')
  }, [])

  const toggleRecording = useCallback(() => {
    setIsRecording(prev => {
      const next = !prev
      setMessage(next ? '∴ scribe resumed • memory ink flowing ∴' : '∴ scribe paused • trail preserved ∴')
      return next
    })
  }, [])

  const toggleFog = useCallback(() => {
    setFogEnabled(prev => {
      const next = !prev
      setMessage(next ? '∴ fog lowered • rely on memory ∴' : '∴ fog lifted • full map revealed ∴')
      return next
    })
  }, [])

  const orientNorth = useCallback(() => {
    playerRef.current.angle = -Math.PI / 2
    setMessage('∴ heading snapped to true north ∴')
  }, [])

  const handleKeyDown = useCallback((e) => {
    const key = e.key.toLowerCase()
    const mapKey = keyRef.current
    if (key === 'w' || e.key === 'ArrowUp') mapKey.forward = true
    if (key === 's' || e.key === 'ArrowDown') mapKey.backward = true
    if (key === 'a') mapKey.left = true
    if (key === 'd') mapKey.right = true
    if (key === 'q') mapKey.turnLeft = true
    if (key === 'e') mapKey.turnRight = true
    if (e.key === 'ArrowLeft') mapKey.turnLeft = true
    if (e.key === 'ArrowRight') mapKey.turnRight = true
    if (e.code === 'Space') {
      e.preventDefault()
      deployEcho()
    }
  }, [deployEcho])

  const handleKeyUp = useCallback((e) => {
    const key = e.key.toLowerCase()
    const mapKey = keyRef.current
    if (key === 'w' || e.key === 'ArrowUp') mapKey.forward = false
    if (key === 's' || e.key === 'ArrowDown') mapKey.backward = false
    if (key === 'a') mapKey.left = false
    if (key === 'd') mapKey.right = false
    if (key === 'q' || e.key === 'ArrowLeft') mapKey.turnLeft = false
    if (key === 'e' || e.key === 'ArrowRight') mapKey.turnRight = false
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  const castRay = useCallback((originX, originY, angle) => {
    const map = mapRef.current
    let distance = 0
    let hit = null
    const step = STEP
    const sin = Math.sin(angle)
    const cos = Math.cos(angle)

    while (distance < MAX_DEPTH) {
      const sampleX = originX + cos * distance
      const sampleY = originY + sin * distance
      const cellX = Math.floor(sampleX)
      const cellY = Math.floor(sampleY)

      if (cellX < 0 || cellY < 0 || cellX >= map.width || cellY >= map.height) {
        hit = { distance, value: 1, glyph: 0 }
        break
      }

      const cell = map.cells[cellY][cellX]
      if (cell !== 0) {
        hit = { distance, value: cell, glyph: map.glyphs[cellY][cellX] }
        break
      }

      distance += step
    }

    if (!hit) hit = { distance: MAX_DEPTH, value: 1, glyph: 0 }
    return hit
  }, [])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    const { width, height } = dimensions
    const map = mapRef.current
    if (!map.cells.length) return

    frameCounterRef.current += 1

    const player = playerRef.current
    const keys = keyRef.current
    const moveSpeed = 0.06
    const strafeSpeed = 0.045
    const turnSpeed = 0.035

    if (keys.turnLeft) player.angle -= turnSpeed
    if (keys.turnRight) player.angle += turnSpeed

    const forward = { x: Math.cos(player.angle), y: Math.sin(player.angle) }
    const right = { x: Math.cos(player.angle + Math.PI / 2), y: Math.sin(player.angle + Math.PI / 2) }

    let moveX = 0
    let moveY = 0
    if (keys.forward) {
      moveX += forward.x * moveSpeed
      moveY += forward.y * moveSpeed
    }
    if (keys.backward) {
      moveX -= forward.x * moveSpeed * 0.65
      moveY -= forward.y * moveSpeed * 0.65
    }
    if (keys.left) {
      moveX -= right.x * strafeSpeed
      moveY -= right.y * strafeSpeed
    }
    if (keys.right) {
      moveX += right.x * strafeSpeed
      moveY += right.y * strafeSpeed
    }

    const cellAt = (x, y) => {
      const cx = Math.floor(x)
      const cy = Math.floor(y)
      if (cy < 0 || cy >= map.height || cx < 0 || cx >= map.width) return 1
      return map.cells[cy][cx]
    }

    const oldX = player.x
    const oldY = player.y
    const targetX = oldX + moveX
    const targetY = oldY + moveY

    let appliedX = 0
    let appliedY = 0

    if (cellAt(targetX, targetY) === 0) {
      player.x = targetX
      player.y = targetY
      appliedX = targetX - oldX
      appliedY = targetY - oldY
    } else {
      if (cellAt(targetX, oldY) === 0) {
        player.x = targetX
        appliedX = targetX - oldX
      }
      if (cellAt(oldX, targetY) === 0) {
        player.y = targetY
        appliedY = targetY - oldY
      }
    }

    const travelled = Math.hypot(appliedX, appliedY)
    if (travelled > 0) {
      statsRef.current.distance += travelled * 12
    }

    const now = performance.now()
    if (isRecording && now - lastRecordRef.current > 70) {
      const prev = pathRef.current[pathRef.current.length - 1]
      if (!prev || Math.hypot(prev.x - player.x, prev.y - player.y) > 0.1) {
        pathRef.current.push({ x: player.x, y: player.y })
        if (pathRef.current.length > 500) pathRef.current.shift()
        lastRecordRef.current = now
      }
    }

    pulsesRef.current = pulsesRef.current.filter(pulse => {
      pulse.radius += 0.18
      pulse.life -= 0.015
      revealAt(pulse.x, pulse.y, pulse.radius * 0.4 + 0.8)
      return pulse.life > 0
    })

    revealAt(player.x, player.y, fogEnabled ? 3.5 : 6)

    const skyHeight = height * 0.44
    const gradient = ctx.createLinearGradient(0, 0, 0, skyHeight)
    gradient.addColorStop(0, 'rgba(7, 17, 28, 0.95)')
    gradient.addColorStop(1, 'rgba(5, 10, 16, 0.6)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, skyHeight)

    const groundGradient = ctx.createLinearGradient(0, skyHeight, 0, height)
    groundGradient.addColorStop(0, 'rgba(2, 6, 10, 0.7)')
    groundGradient.addColorStop(1, 'rgba(6, 14, 18, 0.95)')
    ctx.fillStyle = groundGradient
    ctx.fillRect(0, skyHeight, width, height - skyHeight)

    const rayCount = Math.max(120, Math.floor(width / 4))
    const columnWidth = width / rayCount
    for (let i = 0; i < rayCount; i++) {
      const ratio = i / rayCount
      const rayAngle = player.angle - FOV / 2 + ratio * FOV
      const hit = castRay(player.x, player.y, rayAngle)
      const corrected = hit.distance * Math.cos(rayAngle - player.angle)
      const columnHeight = clamp(height / (corrected + 0.0001), 12, height)
      const brightness = clamp(1 - hit.distance / MAX_DEPTH, 0.05, 1)
      const hueOffset = Math.floor(hit.glyph * 120)
      const hue = mode === 'glyph' ? 320 - hueOffset * 0.5 : 160 + hueOffset
      const saturation = mode === 'glyph' ? 40 : 55 + brightness * 20
      const lightness = 20 + brightness * 45

      ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${mode === 'survey' ? 0.9 : 1})`
      ctx.fillRect(i * columnWidth, skyHeight - columnHeight / 2, columnWidth + 1, columnHeight)

      if (mode === 'glyph') {
        ctx.fillStyle = `rgba(255,255,255,${0.08 + brightness * 0.1})`
        ctx.fillRect(i * columnWidth, skyHeight - columnHeight / 2, columnWidth, 1)
        ctx.fillRect(i * columnWidth, skyHeight + columnHeight / 2, columnWidth, 1)
      }
    }

    const mapScale = clamp(Math.floor(Math.min(width, height) / (map.width * 2.2)), 6, 14)
    const mapSize = map.width * mapScale
    const mapLeft = 18
    const mapTop = height - mapSize - 18
    if (mode === 'survey' && mouse.isDown) {
      if (!markLatchRef.current) {
        const pointer = mouse.positionRef.current || { x: 0, y: 0 }
        const localX = pointer.x - mapLeft
        const localY = pointer.y - mapTop
        if (localX >= 0 && localY >= 0) {
          const mapWidth = map.width * mapScale
          const mapHeight = map.height * mapScale
          if (localX <= mapWidth && localY <= mapHeight) {
            const cellX = Math.floor(localX / mapScale)
            const cellY = Math.floor(localY / mapScale)
            if (map.cells[cellY] && map.cells[cellY][cellX] === 0) {
              markersRef.current.push({
                x: cellX + 0.5,
                y: cellY + 0.5,
                hue: 160 + Math.random() * 160
              })
              statsRef.current.scribes = markersRef.current.length
              markLatchRef.current = true
              setMessage('∴ survey glyph pinned • breadcrumb stored ∴')
            }
          }
        }
      }
    } else {
      markLatchRef.current = false
    }

    ctx.save()
    ctx.translate(mapLeft, mapTop)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fillRect(-8, -8, mapSize + 16, mapSize + 16)

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const cell = map.cells[y][x]
        const seen = map.seen[y][x]
        if (cell === 1) {
          ctx.fillStyle = 'rgba(8, 18, 24, 0.9)'
          ctx.fillRect(x * mapScale, y * mapScale, mapScale, mapScale)
        } else if (!fogEnabled || seen) {
          const base = 25 + map.glyphs[y][x] * 30
          ctx.fillStyle = `hsla(150, 60%, ${35 + base / 3}%, ${fogEnabled ? 0.8 : 0.4})`
          ctx.fillRect(x * mapScale, y * mapScale, mapScale, mapScale)
        } else if (fogEnabled) {
          ctx.fillStyle = 'rgba(5, 10, 14, 0.5)'
          ctx.fillRect(x * mapScale, y * mapScale, mapScale, mapScale)
        }
      }
    }

    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(255, 120, 200, 0.6)'
    ctx.beginPath()
    pathRef.current.forEach((point, idx) => {
      const px = point.x * mapScale
      const py = point.y * mapScale
      if (idx === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.stroke()

    markersRef.current.forEach(marker => {
      ctx.fillStyle = `hsla(${marker.hue}, 80%, 70%, 0.8)`
      ctx.beginPath()
      ctx.arc(marker.x * mapScale, marker.y * mapScale, mapScale * 0.25, 0, Math.PI * 2)
      ctx.fill()
    })

    pulsesRef.current.forEach(pulse => {
      ctx.strokeStyle = `rgba(102, 255, 204, ${pulse.life})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(pulse.x * mapScale, pulse.y * mapScale, pulse.radius * mapScale, 0, Math.PI * 2)
      ctx.stroke()
    })

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.arc(player.x * mapScale, player.y * mapScale, mapScale * 0.2, 0, Math.PI * 2)
    ctx.fill()

    const eyeX = player.x * mapScale + Math.cos(player.angle) * mapScale * 0.6
    const eyeY = player.y * mapScale + Math.sin(player.angle) * mapScale * 0.6
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.9)'
    ctx.beginPath()
    ctx.moveTo(player.x * mapScale, player.y * mapScale)
    ctx.lineTo(eyeX, eyeY)
    ctx.stroke()

    if (mode === 'survey') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.setLineDash([4, 4])
      ctx.strokeRect(0, 0, map.width * mapScale, map.height * mapScale)
      ctx.setLineDash([])
    }

    ctx.restore()

    if (frameCounterRef.current % 16 === 0) {
      statsRef.current.scribes = markersRef.current.length
      setStats({ ...statsRef.current })
    }
  }, [castRay, ctx, dimensions, fogEnabled, isRecording, mode, mouse.isDown, revealAt])

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

  const controls = [
    {
      id: 'regen',
      label: 'catacomb.regen()',
      onClick: carveCatacomb
    },
    {
      id: 'echo',
      label: 'echo.sweep()',
      onClick: deployEcho
    },
    {
      id: 'scribe',
      label: isRecording ? 'scribe.stop()' : 'scribe.start()',
      onClick: toggleRecording,
      active: isRecording
    },
    {
      id: 'fog',
      label: fogEnabled ? 'fog.on()' : 'fog.off()',
      onClick: toggleFog,
      active: fogEnabled
    },
    {
      id: 'orient',
      label: 'orient.north()',
      onClick: orientNorth,
      variant: 'reset'
    }
  ]

  const metrics = useMemo(() => {
    return [
      { label: 'path', value: `${stats.distance.toFixed(1)} steps` },
      { label: 'map', value: `${stats.discovered}%` },
      { label: 'scribes', value: stats.scribes },
      { label: 'echoes', value: stats.echoes },
      { label: 'mode', value: mode }
    ]
  }, [stats, mode])

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center justify-between p-4 border-b border-void-green/20 bg-void-dark/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <ExperimentNav currentCategory={category.slug} currentExperiment={experiment.slug} />
          <h1 className="text-xl text-glow hidden sm:block" style={{ color: experiment.color }}>
            {experiment.name}
          </h1>
        </div>
        <ExperimentMetrics metrics={metrics} />
      </header>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={setMode}
          controls={controls}
        />
        <p className="text-void-green/60 text-xs lg:text-right max-w-xl">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="ray-catacombs-canvas"
        />
      </div>
    </div>
  )
}

export default RayCatacombs
