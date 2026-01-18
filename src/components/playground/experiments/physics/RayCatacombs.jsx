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
  const [escaped, setEscaped] = useState(false)
  const [celebrationTime, setCelebrationTime] = useState(0)

  const mapRef = useRef({ width: MAP_SIZE, height: MAP_SIZE, cells: [], seen: [], glyphs: [], floorCount: 1, exit: null })
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

    // Find start position near center
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

    // Find exit position - furthest floor cell from start
    let exit = { x: 1, y: 1 }
    let maxDist = 0
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (cells[y][x] !== 0) continue
        const dist = Math.abs(x - start.x) + Math.abs(y - start.y)
        if (dist > maxDist) {
          maxDist = dist
          exit = { x, y }
        }
      }
    }
    // Mark exit cell with special value (2 = exit)
    cells[exit.y][exit.x] = 2

    const floorCount = cells.reduce((total, row) => total + row.filter(cell => cell === 0 || cell === 2).length, 0)
    mapRef.current = { width, height, cells, seen, glyphs, floorCount, exit }
    playerRef.current = { x: start.x + 0.5, y: start.y + 0.5, angle: Math.random() * Math.PI * 2 }
    pathRef.current = []
    pulsesRef.current = []
    markersRef.current = []
    discoveryRef.current = { seen: 0, total: Math.max(1, floorCount) }
    statsRef.current = { distance: 0, discovered: 0, scribes: 0, echoes: 0 }
    setStats({ ...statsRef.current })
    setEscaped(false)
    setCelebrationTime(0)
    setMessage('∴ catacombs rewoven • find the void portal to escape ∴')
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
    const sin = Math.sin(angle)
    const cos = Math.cos(angle)

    // DDA algorithm for precise wall hit detection
    const mapX = Math.floor(originX)
    const mapY = Math.floor(originY)

    const deltaDistX = Math.abs(1 / cos) || 1e10
    const deltaDistY = Math.abs(1 / sin) || 1e10

    let stepX, stepY
    let sideDistX, sideDistY

    if (cos < 0) {
      stepX = -1
      sideDistX = (originX - mapX) * deltaDistX
    } else {
      stepX = 1
      sideDistX = (mapX + 1 - originX) * deltaDistX
    }

    if (sin < 0) {
      stepY = -1
      sideDistY = (originY - mapY) * deltaDistY
    } else {
      stepY = 1
      sideDistY = (mapY + 1 - originY) * deltaDistY
    }

    let currentX = mapX
    let currentY = mapY
    let side = 0 // 0 = vertical wall (E/W), 1 = horizontal wall (N/S)
    let distance = 0

    for (let i = 0; i < 200; i++) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX
        currentX += stepX
        side = 0
      } else {
        sideDistY += deltaDistY
        currentY += stepY
        side = 1
      }

      if (currentX < 0 || currentY < 0 || currentX >= map.width || currentY >= map.height) {
        distance = side === 0
          ? (currentX - originX + (1 - stepX) / 2) / cos
          : (currentY - originY + (1 - stepY) / 2) / sin
        return { distance: Math.max(0.1, distance), value: 1, glyph: 0, side }
      }

      if (map.cells[currentY][currentX] !== 0) {
        distance = side === 0
          ? (currentX - originX + (1 - stepX) / 2) / cos
          : (currentY - originY + (1 - stepY) / 2) / sin

        // Calculate wall texture coordinate (0-1)
        let wallX
        if (side === 0) {
          wallX = originY + distance * sin
        } else {
          wallX = originX + distance * cos
        }
        wallX -= Math.floor(wallX)

        return {
          distance: Math.max(0.1, distance),
          value: map.cells[currentY][currentX],
          glyph: map.glyphs[currentY][currentX],
          side,
          wallX
        }
      }
    }

    return { distance: MAX_DEPTH, value: 1, glyph: 0, side: 0, wallX: 0 }
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

    // Check if cell is passable (floor or exit)
    const isPassable = (cell) => cell === 0 || cell === 2

    const oldX = player.x
    const oldY = player.y
    const targetX = oldX + moveX
    const targetY = oldY + moveY

    let appliedX = 0
    let appliedY = 0

    if (isPassable(cellAt(targetX, targetY))) {
      player.x = targetX
      player.y = targetY
      appliedX = targetX - oldX
      appliedY = targetY - oldY
    } else {
      if (isPassable(cellAt(targetX, oldY))) {
        player.x = targetX
        appliedX = targetX - oldX
      }
      if (isPassable(cellAt(oldX, targetY))) {
        player.y = targetY
        appliedY = targetY - oldY
      }
    }

    const travelled = Math.hypot(appliedX, appliedY)
    if (travelled > 0) {
      statsRef.current.distance += travelled * 12
    }

    // Check for escape - player reached the exit portal
    if (!escaped && map.exit) {
      const playerCellX = Math.floor(player.x)
      const playerCellY = Math.floor(player.y)
      if (playerCellX === map.exit.x && playerCellY === map.exit.y) {
        setEscaped(true)
        setCelebrationTime(performance.now())
        setMessage('∴ YOU ESCAPED THE CATACOMBS! ∴ void consciousness transcended ∴')
      }
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
      const baseBrightness = clamp(1 - hit.distance / MAX_DEPTH, 0.08, 1)

      // Side-based shading: E/W walls (side=0) are darker than N/S walls (side=1)
      const sideFactor = hit.side === 0 ? 0.65 : 1.0
      const brightness = baseBrightness * sideFactor

      const hueOffset = Math.floor(hit.glyph * 120)
      const hue = mode === 'glyph' ? 320 - hueOffset * 0.5 : 155 + hueOffset * 0.3
      const saturation = mode === 'glyph' ? 40 : 50 + brightness * 25
      const lightness = 12 + brightness * 48

      const colX = i * columnWidth
      const colTop = skyHeight - columnHeight / 2
      const colBottom = skyHeight + columnHeight / 2

      // Create vertical gradient for each wall column (lighting from above)
      const wallGradient = ctx.createLinearGradient(0, colTop, 0, colBottom)
      const topLight = clamp(lightness + 8 * brightness, 0, 70)
      const midLight = lightness
      const bottomLight = clamp(lightness - 10, 5, 50)

      wallGradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${topLight}%, ${mode === 'survey' ? 0.9 : 1})`)
      wallGradient.addColorStop(0.15, `hsla(${hue}, ${saturation}%, ${midLight}%, ${mode === 'survey' ? 0.9 : 1})`)
      wallGradient.addColorStop(0.85, `hsla(${hue}, ${saturation}%, ${midLight}%, ${mode === 'survey' ? 0.9 : 1})`)
      wallGradient.addColorStop(1, `hsla(${hue}, ${saturation - 10}%, ${bottomLight}%, ${mode === 'survey' ? 0.9 : 1})`)

      ctx.fillStyle = wallGradient
      ctx.fillRect(colX, colTop, columnWidth + 1, columnHeight)

      // Procedural brick texture - scale based on distance for consistent appearance
      const wallX = hit.wallX || 0
      // More brick rows visible at distance, fewer when close (consistent brick size)
      const baseBrickRows = 6
      const distanceFactor = clamp(hit.distance / 4, 0.5, 3)
      const visibleBrickRows = Math.round(baseBrickRows * distanceFactor)
      const brickWidth = 0.25 // Brick width as fraction of wall (4 bricks wide)
      const mortarThickness = 0.04 / distanceFactor // Thinner mortar when close

      // Only draw bricks if wall is close enough to see detail
      if (hit.distance < 12 && columnHeight > 20) {
        // Draw brick mortar lines
        for (let row = 0; row < visibleBrickRows; row++) {
          const rowY = colTop + (row / visibleBrickRows) * columnHeight
          const rowHeight = columnHeight / visibleBrickRows

          // Skip if row is too small to see
          if (rowHeight < 3) continue

          // Horizontal mortar line
          const mortarAlpha = 0.15 * brightness
          ctx.fillStyle = `rgba(15, 35, 30, ${mortarAlpha})`
          const mortarHeight = Math.max(1, Math.min(3, rowHeight * 0.08))
          ctx.fillRect(colX, rowY, columnWidth + 1, mortarHeight)

          // Vertical mortar - offset every other row
          const rowOffset = (row % 2) * (brickWidth / 2)
          const adjustedWallX = (wallX + rowOffset) % brickWidth
          const distFromVertMortar = Math.min(adjustedWallX, brickWidth - adjustedWallX)

          if (distFromVertMortar < mortarThickness) {
            ctx.fillStyle = `rgba(15, 35, 30, ${mortarAlpha * 0.7})`
            ctx.fillRect(colX, rowY, columnWidth + 1, rowHeight)
          }
        }
      }

      // Add subtle edge highlight using wallX texture coordinate
      const edgeDist = Math.min(wallX, 1 - wallX) // Distance from edge (0-0.5)
      if (edgeDist < 0.06 && brightness > 0.3) {
        const edgeAlpha = (0.06 - edgeDist) * 2.5 * brightness
        ctx.fillStyle = `rgba(140, 255, 200, ${edgeAlpha * 0.12})`
        ctx.fillRect(colX, colTop, columnWidth + 1, columnHeight)
      }

      // Top edge highlight
      if (brightness > 0.2) {
        ctx.fillStyle = `rgba(180, 255, 220, ${0.05 + brightness * 0.1})`
        ctx.fillRect(colX, colTop, columnWidth + 1, 2)
      }

      if (mode === 'glyph') {
        ctx.fillStyle = `rgba(255,255,255,${0.08 + brightness * 0.1})`
        ctx.fillRect(colX, colTop, columnWidth, 1)
        ctx.fillRect(colX, colBottom, columnWidth, 1)
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
        } else if (cell === 2) {
          // Exit portal - only visible on minimap when player has explored that cell
          if (seen) {
            // Glowing magenta/pink portal
            const pulse = Math.sin(frameCounterRef.current * 0.08) * 0.3 + 0.7
            ctx.fillStyle = `hsla(300, 80%, ${50 + pulse * 20}%, 0.9)`
            ctx.fillRect(x * mapScale, y * mapScale, mapScale, mapScale)
            // Glow effect
            ctx.fillStyle = `hsla(320, 90%, 70%, ${pulse * 0.4})`
            ctx.beginPath()
            ctx.arc((x + 0.5) * mapScale, (y + 0.5) * mapScale, mapScale * 0.8, 0, Math.PI * 2)
            ctx.fill()
          } else if (fogEnabled) {
            // Hidden in fog
            ctx.fillStyle = 'rgba(5, 10, 14, 0.5)'
            ctx.fillRect(x * mapScale, y * mapScale, mapScale, mapScale)
          } else {
            // Fog disabled but not yet discovered - show as regular floor
            const base = 25 + map.glyphs[y][x] * 30
            ctx.fillStyle = `hsla(150, 60%, ${35 + base / 3}%, 0.4)`
            ctx.fillRect(x * mapScale, y * mapScale, mapScale, mapScale)
          }
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

    // Celebration effect when escaped
    if (escaped) {
      const timeSinceEscape = now - celebrationTime
      const celebrationDuration = 5000 // 5 seconds of celebration

      if (timeSinceEscape < celebrationDuration) {
        const progress = timeSinceEscape / celebrationDuration

        // Radial burst of particles
        const particleCount = 50
        for (let p = 0; p < particleCount; p++) {
          const angle = (p / particleCount) * Math.PI * 2 + progress * 2
          const radius = 50 + progress * Math.min(width, height) * 0.4
          const px = width / 2 + Math.cos(angle) * radius
          const py = height / 2 + Math.sin(angle) * radius
          const size = 3 + Math.sin(progress * Math.PI) * 5
          const hue = (p * 7 + timeSinceEscape * 0.1) % 360
          const alpha = 1 - progress

          ctx.fillStyle = `hsla(${hue}, 90%, 60%, ${alpha})`
          ctx.beginPath()
          ctx.arc(px, py, size, 0, Math.PI * 2)
          ctx.fill()
        }

        // Central glow
        const glowSize = 100 + Math.sin(timeSinceEscape * 0.01) * 30
        const glowGradient = ctx.createRadialGradient(
          width / 2, height / 2, 0,
          width / 2, height / 2, glowSize
        )
        glowGradient.addColorStop(0, `hsla(300, 100%, 80%, ${0.4 * (1 - progress)})`)
        glowGradient.addColorStop(1, 'hsla(300, 100%, 50%, 0)')
        ctx.fillStyle = glowGradient
        ctx.fillRect(0, 0, width, height)

        // "ESCAPED!" text
        ctx.save()
        ctx.font = `bold ${48 + Math.sin(timeSinceEscape * 0.02) * 8}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = `hsla(${(timeSinceEscape * 0.1) % 360}, 100%, 70%, ${1 - progress * 0.5})`
        ctx.shadowColor = 'rgba(255, 100, 255, 0.8)'
        ctx.shadowBlur = 20
        ctx.fillText('∴ VOID TRANSCENDED ∴', width / 2, height / 3)
        ctx.restore()
      }
    }

    // Portal glow on ground when near exit (3D effect)
    if (map.exit && !escaped) {
      const distToExit = Math.hypot(player.x - (map.exit.x + 0.5), player.y - (map.exit.y + 0.5))
      if (distToExit < 5) {
        const glowIntensity = clamp(1 - distToExit / 5, 0, 1)
        const pulse = Math.sin(frameCounterRef.current * 0.1) * 0.3 + 0.7
        ctx.fillStyle = `hsla(300, 80%, 50%, ${glowIntensity * pulse * 0.15})`
        ctx.fillRect(0, skyHeight, width, height - skyHeight)
      }
    }

    if (frameCounterRef.current % 16 === 0) {
      statsRef.current.scribes = markersRef.current.length
      setStats({ ...statsRef.current })
    }
  }, [castRay, ctx, dimensions, escaped, celebrationTime, fogEnabled, isRecording, mode, mouse.isDown, revealAt])

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
