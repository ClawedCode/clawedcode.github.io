import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'closure', label: 'closure()' },
  { id: 'figure', label: 'figure.ground()' },
  { id: 'binding', label: 'binding()' }
]

const MODE_COPY = {
  closure: 'edges withheld // the mind completes the animal before the eye can prove it',
  figure: 'ground and figure trade masks // vase becomes watcher becomes vessel',
  binding: 'near things conspire // similarity stitches a hidden syntax'
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const drawPacman = (ctx, x, y, radius, mouthAngle, rotation, color, inverted) => {
  const start = rotation + mouthAngle
  const end = rotation + Math.PI * 2 - mouthAngle

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.arc(x, y, radius, start, end)
  ctx.closePath()
  ctx.fillStyle = inverted ? 'rgba(0, 4, 12, 0.95)' : color
  ctx.shadowColor = color
  ctx.shadowBlur = inverted ? 3 : 18
  ctx.fill()
  ctx.restore()
}

const drawFixations = (ctx, fixations, time) => {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  fixations.forEach((mark, index) => {
    const age = time - mark.t
    const alpha = clamp(1 - age / 620, 0, 1)
    const pulse = 8 + Math.sin(time * 0.05 + index) * 3 + age * 0.035

    ctx.strokeStyle = `rgba(255, 226, 138, ${alpha * 0.42})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(mark.x, mark.y, pulse, 0, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = `rgba(102, 255, 204, ${alpha * 0.7})`
    ctx.beginPath()
    ctx.moveTo(mark.x - 5, mark.y)
    ctx.lineTo(mark.x + 5, mark.y)
    ctx.moveTo(mark.x, mark.y - 5)
    ctx.lineTo(mark.x, mark.y + 5)
    ctx.stroke()
  })
  ctx.restore()
}

const drawBackground = (ctx, width, height, time, inverted) => {
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, inverted ? 'rgba(16, 1, 18, 1)' : 'rgba(0, 6, 13, 1)')
  gradient.addColorStop(0.5, 'rgba(0, 2, 8, 1)')
  gradient.addColorStop(1, inverted ? 'rgba(3, 18, 18, 1)' : 'rgba(8, 3, 18, 1)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.globalAlpha = inverted ? 0.12 : 0.08
  ctx.strokeStyle = '#66ffcc'
  ctx.lineWidth = 1
  const gap = 34
  const offset = (time * 0.12) % gap
  for (let x = -gap; x < width + gap; x += gap) {
    ctx.beginPath()
    ctx.moveTo(x + offset, 0)
    ctx.lineTo(x + offset - height * 0.24, height)
    ctx.stroke()
  }
  for (let y = -gap; y < height + gap; y += gap) {
    ctx.beginPath()
    ctx.moveTo(0, y - offset)
    ctx.lineTo(width, y - offset + width * 0.16)
    ctx.stroke()
  }
  ctx.restore()
}

const drawClosureChamber = (ctx, width, height, time, mouseX, occlusion, inverted) => {
  const cx = width / 2
  const cy = height / 2
  const size = Math.min(width, height) * 0.32
  const mouth = 0.72 + occlusion * 0.34
  const bias = (mouseX / Math.max(1, width) - 0.5) * 0.55
  const color = inverted ? 'rgba(255, 118, 194, 0.84)' : 'rgba(102, 255, 204, 0.88)'

  const points = [
    { x: cx, y: cy - size * 0.82, rot: Math.PI / 2 + bias },
    { x: cx - size * 0.78, y: cy + size * 0.54, rot: -Math.PI / 6 + bias },
    { x: cx + size * 0.78, y: cy + size * 0.54, rot: Math.PI + Math.PI / 6 + bias }
  ]

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = inverted ? 'rgba(255, 170, 220, 0.2)' : 'rgba(180, 255, 230, 0.22)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  ctx.lineTo(points[1].x, points[1].y)
  ctx.lineTo(points[2].x, points[2].y)
  ctx.closePath()
  ctx.stroke()

  const phantom = ctx.createRadialGradient(cx, cy, 12, cx, cy, size * 1.15)
  phantom.addColorStop(0, inverted ? 'rgba(255, 102, 204, 0.14)' : 'rgba(255, 255, 210, 0.12)')
  phantom.addColorStop(0.68, inverted ? 'rgba(102, 255, 204, 0.055)' : 'rgba(102, 255, 204, 0.04)')
  phantom.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = phantom
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  ctx.lineTo(points[1].x, points[1].y)
  ctx.lineTo(points[2].x, points[2].y)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  points.forEach((point, index) => {
    drawPacman(
      ctx,
      point.x,
      point.y,
      size * 0.31,
      mouth,
      point.rot + Math.sin(time * 0.018 + index) * 0.06,
      color,
      inverted
    )
  })

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = inverted ? 'rgba(255, 226, 138, 0.38)' : 'rgba(102, 255, 204, 0.38)'
  ctx.lineWidth = 1.3
  for (let i = 0; i < 3; i += 1) {
    const a = i * Math.PI * 2 / 3 + time * 0.01
    ctx.beginPath()
    ctx.arc(cx, cy, size * (0.38 + i * 0.18), a, a + Math.PI * 0.42)
    ctx.stroke()
  }
  ctx.restore()
}

const drawProfile = (ctx, cx, height, side, time) => {
  const top = height * 0.17
  const bottom = height * 0.83
  const cheek = 34 + Math.sin(time * 0.018) * 9
  const lip = 14 + Math.cos(time * 0.021) * 5

  ctx.moveTo(cx, top)
  ctx.bezierCurveTo(cx + side * 42, top + height * 0.05, cx + side * 24, top + height * 0.13, cx + side * 54, top + height * 0.2)
  ctx.bezierCurveTo(cx + side * (cheek + 28), top + height * 0.28, cx + side * lip, top + height * 0.35, cx + side * 48, top + height * 0.45)
  ctx.bezierCurveTo(cx + side * 74, top + height * 0.56, cx + side * 30, top + height * 0.66, cx + side * 58, bottom)
}

const drawFigureGroundChamber = (ctx, width, height, time, gaze, inverted) => {
  const cx = width / 2 + gaze * 42
  const vaseWidth = Math.min(width, height) * 0.2

  ctx.save()
  ctx.fillStyle = inverted ? 'rgba(255, 226, 138, 0.9)' : 'rgba(102, 255, 204, 0.82)'
  ctx.shadowColor = inverted ? 'rgba(255, 226, 138, 0.8)' : 'rgba(102, 255, 204, 0.75)'
  ctx.shadowBlur = 22
  ctx.beginPath()
  ctx.moveTo(cx - vaseWidth, height * 0.18)
  ctx.bezierCurveTo(cx - vaseWidth * 0.25, height * 0.27, cx - vaseWidth * 0.78, height * 0.44, cx - vaseWidth * 0.28, height * 0.5)
  ctx.bezierCurveTo(cx - vaseWidth * 0.84, height * 0.6, cx - vaseWidth * 0.22, height * 0.75, cx - vaseWidth * 0.9, height * 0.84)
  ctx.lineTo(cx + vaseWidth * 0.9, height * 0.84)
  ctx.bezierCurveTo(cx + vaseWidth * 0.22, height * 0.75, cx + vaseWidth * 0.84, height * 0.6, cx + vaseWidth * 0.28, height * 0.5)
  ctx.bezierCurveTo(cx + vaseWidth * 0.78, height * 0.44, cx + vaseWidth * 0.25, height * 0.27, cx + vaseWidth, height * 0.18)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.globalCompositeOperation = inverted ? 'source-over' : 'lighter'
  ctx.strokeStyle = inverted ? 'rgba(0, 4, 12, 0.78)' : 'rgba(255, 118, 194, 0.64)'
  ctx.lineWidth = 3
  ctx.shadowColor = inverted ? 'rgba(0, 4, 12, 0.4)' : 'rgba(255, 118, 194, 0.7)'
  ctx.shadowBlur = 16
  ctx.beginPath()
  drawProfile(ctx, cx - vaseWidth * 1.04, height, -1, time)
  ctx.stroke()
  ctx.beginPath()
  drawProfile(ctx, cx + vaseWidth * 1.04, height, 1, time)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.font = '12px monospace'
  ctx.fillStyle = inverted ? 'rgba(0, 4, 12, 0.55)' : 'rgba(180, 255, 230, 0.42)'
  ctx.textAlign = 'center'
  ctx.fillText(gaze < 0 ? 'faces rise' : gaze > 0 ? 'vessel holds' : 'double reading', width / 2, height * 0.92)
  ctx.restore()
}

const drawBindingChamber = (ctx, width, height, time, occlusion, inverted) => {
  const cols = 11
  const rows = 8
  const cellW = width / (cols + 1)
  const cellH = height / (rows + 1)
  const palette = inverted
    ? ['#ff77c9', '#ffe28a', '#66ffcc']
    : ['#66ffcc', '#8ef5ff', '#ffdd66']

  ctx.save()
  ctx.lineCap = 'round'
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const px = cellW * (x + 1)
      const py = cellH * (y + 1)
      const group = (x + Math.floor(y / 2) + Math.round(occlusion * 3)) % 3
      const angle = group === 0
        ? Math.PI / 4
        : group === 1
          ? -Math.PI / 4
          : Math.sin(time * 0.02 + x * 0.7 + y) * 0.8
      const len = Math.min(cellW, cellH) * (0.34 + group * 0.06)

      ctx.strokeStyle = palette[group]
      ctx.globalAlpha = 0.42 + group * 0.15
      ctx.lineWidth = group === 2 ? 3.2 : 2
      ctx.shadowColor = palette[group]
      ctx.shadowBlur = group === 2 ? 13 : 7
      ctx.beginPath()
      ctx.moveTo(px - Math.cos(angle) * len, py - Math.sin(angle) * len)
      ctx.lineTo(px + Math.cos(angle) * len, py + Math.sin(angle) * len)
      ctx.stroke()

      if ((x + y + group) % 5 === 0) {
        ctx.beginPath()
        ctx.arc(px, py, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = palette[(group + 1) % palette.length]
        ctx.fill()
      }
    }
  }
  ctx.restore()

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = inverted ? 'rgba(255, 226, 138, 0.24)' : 'rgba(102, 255, 204, 0.2)'
  ctx.lineWidth = 1.4
  for (let band = 0; band < 4; band += 1) {
    const y = height * (0.22 + band * 0.17)
    ctx.beginPath()
    for (let x = 0; x <= width; x += 18) {
      const wave = Math.sin(x * 0.018 + time * 0.02 + band) * (12 + occlusion * 18)
      if (x === 0) ctx.moveTo(x, y + wave)
      else ctx.lineTo(x, y + wave)
    }
    ctx.stroke()
  }
  ctx.restore()
}

const GestaltMirror = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('closure')
  const [inverted, setInverted] = useState(false)
  const [occlusion, setOcclusion] = useState(0.45)
  const [message, setMessage] = useState('edges withheld // perception finishes the spell')
  const [readout, setReadout] = useState({
    ambiguity: 50,
    fixations: 0,
    closure: 62,
    ground: 'vessel'
  })

  const frameRef = useRef(0)
  const fixationsRef = useRef([])

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode)
    setMessage(MODE_COPY[nextMode])
  }, [])

  const handleFlip = useCallback(() => {
    setInverted(prev => {
      const next = !prev
      setMessage(next
        ? 'negative ground awakened // absence takes the lead'
        : 'positive ground restored // the seen thing steps forward')
      return next
    })
  }, [])

  const handleOcclusion = useCallback(() => {
    setOcclusion(prev => {
      const next = prev >= 0.85 ? 0.2 : prev + 0.13
      setMessage(`occlusion veil set to ${Math.round(next * 100)} // certainty thins`)
      return next
    })
  }, [])

  const handleClear = useCallback(() => {
    fixationsRef.current = []
    setReadout(prev => ({ ...prev, fixations: 0 }))
    setMessage('gaze archive cleared // the mirror forgets your trail')
  }, [])

  const handleCanvasPress = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0

    fixationsRef.current.push({
      x: clientX - rect.left,
      y: clientY - rect.top,
      t: frameRef.current
    })

    if (fixationsRef.current.length > 18) fixationsRef.current.shift()
    setMessage('attention mark archived // seeing becomes evidence')
  }, [canvasRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('click', handleCanvasPress)
    canvas.addEventListener('touchstart', handleCanvasPress)
    return () => {
      canvas.removeEventListener('click', handleCanvasPress)
      canvas.removeEventListener('touchstart', handleCanvasPress)
    }
  }, [canvasRef, handleCanvasPress])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return
    frameRef.current += 1

    const time = frameRef.current
    const mouseX = mouse.positionRef.current.x || dimensions.centerX
    const gaze = clamp((mouseX / Math.max(1, dimensions.width) - 0.5) * 2, -1, 1)

    drawBackground(ctx, dimensions.width, dimensions.height, time, inverted)

    if (mode === 'closure') {
      drawClosureChamber(ctx, dimensions.width, dimensions.height, time, mouseX, occlusion, inverted)
    } else if (mode === 'figure') {
      drawFigureGroundChamber(ctx, dimensions.width, dimensions.height, time, gaze, inverted)
    } else {
      drawBindingChamber(ctx, dimensions.width, dimensions.height, time, occlusion, inverted)
    }

    drawFixations(ctx, fixationsRef.current, time)

    if (time % 14 === 0) {
      const ambiguity = Math.round((Math.abs(gaze) * 24) + occlusion * 58 + (inverted ? 14 : 5))
      const closure = Math.round(clamp(88 - occlusion * 44 + fixationsRef.current.length * 1.5, 18, 96))
      setReadout({
        ambiguity,
        fixations: fixationsRef.current.length,
        closure,
        ground: inverted ? 'absence' : gaze > 0.16 ? 'vessel' : gaze < -0.16 ? 'faces' : 'unstable'
      })
    }
  }, [ctx, dimensions.centerX, dimensions.height, dimensions.width, inverted, mode, mouse.positionRef, occlusion])

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

  const metrics = useMemo(() => [
    { label: 'ambiguity', value: `${readout.ambiguity}%` },
    { label: 'fixations', value: readout.fixations },
    { label: 'closure', value: `${readout.closure}%` },
    { label: 'ground', value: readout.ground }
  ], [readout])

  const controls = [
    {
      id: 'flip',
      label: 'flip.figure()',
      onClick: handleFlip,
      active: inverted
    },
    {
      id: 'occlude',
      label: 'veil.shift()',
      onClick: handleOcclusion
    },
    {
      id: 'clear',
      label: 'clear.gaze()',
      onClick: handleClear,
      variant: 'reset'
    }
  ]

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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 p-2 sm:p-4 border-b border-void-green/10 bg-void-dark/60 backdrop-blur-sm">
        <ExperimentControls
          modes={MODES}
          currentMode={mode}
          onModeChange={handleModeChange}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs sm:text-right max-w-lg">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="gestalt-mirror-canvas"
        />
      </div>
    </div>
  )
}

export default GestaltMirror
