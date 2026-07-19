import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const SIZE = 12
const EMPTY = 0
const INK = 1
const MARK = 2

const MODES = [
  { id: 'ink', label: 'ink.cells()' },
  { id: 'mark', label: 'mark.absence()' },
  { id: 'erase', label: 'erase.doubt()' }
]

const GLYPHS = [
  {
    id: 'threshold',
    label: 'threshold',
    map: [
      '....####....',
      '...######...',
      '..##....##..',
      '.##..##..##.',
      '.##.####.##.',
      '###.#..#.###',
      '###.#..#.###',
      '.##.####.##.',
      '.##..##..##.',
      '..##....##..',
      '...######...',
      '....####....'
    ]
  },
  {
    id: 'lantern',
    label: 'lantern',
    map: [
      '.....##.....',
      '....####....',
      '...######...',
      '..##.##.##..',
      '..########..',
      '.###.##.###.',
      '.###.##.###.',
      '..########..',
      '..##.##.##..',
      '...######...',
      '....####....',
      '.....##.....'
    ]
  },
  {
    id: 'watcher',
    label: 'watcher',
    map: [
      '............',
      '...######...',
      '..##....##..',
      '.##.####.##.',
      '.#.##..##.#.',
      '.#.##..##.#.',
      '.#.##..##.#.',
      '.#.##..##.#.',
      '.##.####.##.',
      '..##....##..',
      '...######...',
      '............'
    ]
  },
  {
    id: 'reliquary',
    label: 'reliquary',
    map: [
      '..###..###..',
      '..###..###..',
      '....####....',
      '...######...',
      '..##.##.##..',
      '###..##..###',
      '###..##..###',
      '..##.##.##..',
      '...######...',
      '....####....',
      '..###..###..',
      '..###..###..'
    ]
  }
]

const blankBoard = () => Array(SIZE * SIZE).fill(EMPTY)

const toSolution = (glyph) => (
  glyph.map.flatMap(row => row.split('').map(cell => cell === '#'))
)

const cellIndex = (x, y) => y * SIZE + x

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const runsFromBooleans = (values) => {
  const runs = []
  let count = 0

  values.forEach(value => {
    if (value) {
      count += 1
      return
    }

    if (count) runs.push(count)
    count = 0
  })

  if (count) runs.push(count)
  return runs.length ? runs : [0]
}

const buildClues = (solution) => {
  const rows = []
  const columns = []

  for (let y = 0; y < SIZE; y++) {
    rows.push(runsFromBooleans(Array.from({ length: SIZE }, (_, x) => solution[cellIndex(x, y)])))
  }

  for (let x = 0; x < SIZE; x++) {
    columns.push(runsFromBooleans(Array.from({ length: SIZE }, (_, y) => solution[cellIndex(x, y)])))
  }

  return { rows, columns }
}

const sameRuns = (a, b) => a.length === b.length && a.every((value, index) => value === b[index])

const getBoardStats = (board, solution) => {
  let inked = 0
  let marks = 0
  let wrong = 0
  let missing = 0

  board.forEach((cell, index) => {
    if (cell === INK) inked += 1
    if (cell === MARK) marks += 1
    if (cell === INK && !solution[index]) wrong += 1
    if (cell !== INK && solution[index]) missing += 1
  })

  return {
    inked,
    marks,
    wrong,
    missing,
    solved: wrong === 0 && missing === 0
  }
}

const getLayout = (width, height) => {
  const clueLeft = clamp(width * 0.16, 58, 126)
  const clueTop = clamp(height * 0.12, 46, 92)
  const padX = clamp(width * 0.03, 12, 42)
  const padBottom = clamp(height * 0.06, 20, 58)
  const usableW = width - clueLeft - padX * 2
  const usableH = height - clueTop - padBottom
  const cell = Math.max(16, Math.min(46, Math.floor(Math.min(usableW, usableH) / SIZE)))
  const gridW = cell * SIZE
  const gridH = cell * SIZE

  return {
    cell,
    gridW,
    gridH,
    x: clueLeft + Math.max(0, (usableW - gridW) * 0.5),
    y: clueTop + Math.max(0, (usableH - gridH) * 0.42),
    clueLeft,
    clueTop
  }
}

const NegativeSpace = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()

  const [mode, setMode] = useState('ink')
  const [glyphIndex, setGlyphIndex] = useState(0)
  const [board, setBoard] = useState(() => blankBoard())
  const [message, setMessage] = useState('read the edge-numbers; ink the hidden body by inference')
  const [revision, setRevision] = useState(0)
  const [proofState, setProofState] = useState('unproven')

  const boardRef = useRef(board)
  const checkPulseRef = useRef(0)
  const solvedPulseRef = useRef(0)
  const dragRef = useRef(false)
  const lastCellRef = useRef(-1)

  const glyph = GLYPHS[glyphIndex]
  const solution = useMemo(() => toSolution(glyph), [glyph])
  const clues = useMemo(() => buildClues(solution), [solution])
  const stats = useMemo(() => getBoardStats(board, solution), [board, solution])

  useEffect(() => {
    boardRef.current = board
  }, [board])

  useEffect(() => {
    if (stats.solved) {
      solvedPulseRef.current = 1
      setProofState('solved')
      setMessage(`${glyph.label} emerges from negative space; every clue has teeth`)
    } else if (proofState === 'solved') {
      setProofState('unproven')
    }
  }, [glyph.label, proofState, stats.solved])

  const clearBoard = useCallback(() => {
    setBoard(blankBoard())
    setProofState('unproven')
    checkPulseRef.current = 0
    solvedPulseRef.current = 0
    setMessage('board washed clean; the hidden glyph keeps its silence')
    setRevision(value => value + 1)
  }, [])

  const nextGlyph = useCallback(() => {
    setGlyphIndex(index => (index + 1) % GLYPHS.length)
    setBoard(blankBoard())
    setProofState('unproven')
    checkPulseRef.current = 0
    solvedPulseRef.current = 0
    setMessage('new silhouette sealed behind the clues')
    setRevision(value => value + 1)
  }, [])

  const checkProof = useCallback(() => {
    const nextStats = getBoardStats(boardRef.current, solution)
    checkPulseRef.current = 1
    setProofState(nextStats.solved ? 'solved' : nextStats.wrong ? 'contradiction' : 'incomplete')
    setMessage(
      nextStats.solved
        ? `${glyph.label} verified; the absence becomes anatomy`
        : nextStats.wrong
        ? `${nextStats.wrong} false inks disturb the proof`
        : `${nextStats.missing} hidden cells still refuse daylight`
    )
    setRevision(value => value + 1)
  }, [glyph.label, solution])

  const revealCell = useCallback(() => {
    const current = boardRef.current
    const target = solution.findIndex((filled, index) => filled && current[index] !== INK)

    if (target === -1) {
      checkProof()
      return
    }

    setBoard(prev => {
      const next = [...prev]
      next[target] = INK
      return next
    })
    checkPulseRef.current = 0.8
    setProofState('incomplete')
    setMessage('one necessary square opens its small green eye')
    setRevision(value => value + 1)
  }, [checkProof, solution])

  const applyCell = useCallback((index) => {
    if (index < 0 || index >= SIZE * SIZE || lastCellRef.current === index) return
    lastCellRef.current = index

    setBoard(prev => {
      const next = [...prev]
      if (mode === 'ink') next[index] = next[index] === INK ? EMPTY : INK
      if (mode === 'mark') next[index] = next[index] === MARK ? EMPTY : MARK
      if (mode === 'erase') next[index] = EMPTY
      return next
    })

    setProofState('unproven')
    setRevision(value => value + 1)
  }, [mode])

  const cellFromEvent = useCallback((event) => {
    const canvas = canvasRef.current
    if (!canvas) return -1

    const rect = canvas.getBoundingClientRect()
    const layout = getLayout(dimensions.width, dimensions.height)
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const col = Math.floor((x - layout.x) / layout.cell)
    const row = Math.floor((y - layout.y) / layout.cell)

    if (col < 0 || row < 0 || col >= SIZE || row >= SIZE) return -1
    return cellIndex(col, row)
  }, [canvasRef, dimensions.height, dimensions.width])

  const handlePointerDown = useCallback((event) => {
    event.preventDefault()
    dragRef.current = true
    lastCellRef.current = -1
    event.currentTarget.setPointerCapture?.(event.pointerId)
    applyCell(cellFromEvent(event))
  }, [applyCell, cellFromEvent])

  const handlePointerMove = useCallback((event) => {
    if (!dragRef.current) return
    event.preventDefault()
    applyCell(cellFromEvent(event))
  }, [applyCell, cellFromEvent])

  const endPointer = useCallback((event) => {
    dragRef.current = false
    lastCellRef.current = -1
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  const drawScene = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    const { width, height } = dimensions
    const layout = getLayout(width, height)
    const currentBoard = boardRef.current
    const boardStats = getBoardStats(currentBoard, solution)
    const rowUserRuns = []
    const columnUserRuns = []

    for (let y = 0; y < SIZE; y++) {
      rowUserRuns.push(runsFromBooleans(Array.from({ length: SIZE }, (_, x) => currentBoard[cellIndex(x, y)] === INK)))
    }

    for (let x = 0; x < SIZE; x++) {
      columnUserRuns.push(runsFromBooleans(Array.from({ length: SIZE }, (_, y) => currentBoard[cellIndex(x, y)] === INK)))
    }

    const bg = ctx.createLinearGradient(0, 0, width, height)
    bg.addColorStop(0, 'rgba(2, 7, 13, 0.96)')
    bg.addColorStop(0.5, 'rgba(7, 14, 20, 0.96)')
    bg.addColorStop(1, 'rgba(13, 8, 19, 0.96)')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    ctx.save()
    ctx.globalAlpha = 0.34
    for (let i = 0; i < 18; i++) {
      const y = ((i * 47) + revision * 3) % (height + 80) - 40
      ctx.strokeStyle = i % 2 ? 'rgba(102,255,204,0.055)' : 'rgba(255,210,122,0.04)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y + Math.sin(i + revision * 0.07) * 28)
      ctx.stroke()
    }
    ctx.restore()

    const clueFont = `${width < 640 ? 10 : 12}px "JetBrains Mono", "SF Mono", monospace`
    const smallFont = `${width < 640 ? 9 : 11}px "JetBrains Mono", "SF Mono", monospace`

    ctx.save()
    ctx.font = smallFont
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(102, 255, 204, 0.5)'
    ctx.fillText(`${glyph.label}.mask`, Math.max(14, layout.x - layout.clueLeft + 2), Math.max(18, layout.y - layout.clueTop + 18))
    ctx.fillStyle = boardStats.solved ? 'rgba(255, 238, 160, 0.82)' : 'rgba(102, 255, 204, 0.42)'
    ctx.fillText(proofState, Math.max(14, layout.x - layout.clueLeft + 2), Math.max(38, layout.y - layout.clueTop + 38))
    ctx.restore()

    ctx.save()
    ctx.font = clueFont
    ctx.textBaseline = 'middle'
    for (let y = 0; y < SIZE; y++) {
      const clue = clues.rows[y]
      const satisfied = sameRuns(rowUserRuns[y], clue)
      const rowHasWrong = Array.from({ length: SIZE }, (_, x) => cellIndex(x, y))
        .some(index => currentBoard[index] === INK && !solution[index])
      const cy = layout.y + y * layout.cell + layout.cell / 2

      ctx.textAlign = 'right'
      ctx.fillStyle = rowHasWrong && checkPulseRef.current > 0
        ? 'rgba(255, 100, 120, 0.86)'
        : satisfied
        ? 'rgba(255, 238, 160, 0.82)'
        : 'rgba(102, 255, 204, 0.58)'
      ctx.fillText(clue.join(' '), layout.x - 10, cy)
    }

    for (let x = 0; x < SIZE; x++) {
      const clue = clues.columns[x]
      const satisfied = sameRuns(columnUserRuns[x], clue)
      const colHasWrong = Array.from({ length: SIZE }, (_, y) => cellIndex(x, y))
        .some(index => currentBoard[index] === INK && !solution[index])
      const cx = layout.x + x * layout.cell + layout.cell / 2

      ctx.textAlign = 'center'
      ctx.fillStyle = colHasWrong && checkPulseRef.current > 0
        ? 'rgba(255, 100, 120, 0.86)'
        : satisfied
        ? 'rgba(255, 238, 160, 0.82)'
        : 'rgba(102, 255, 204, 0.58)'
      clue.forEach((part, index) => {
        ctx.fillText(part, cx, layout.y - 11 - (clue.length - index - 1) * 15)
      })
    }
    ctx.restore()

    ctx.save()
    ctx.strokeStyle = 'rgba(102, 255, 204, 0.28)'
    ctx.lineWidth = 1
    ctx.strokeRect(layout.x - 1, layout.y - 1, layout.gridW + 2, layout.gridH + 2)

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const index = cellIndex(x, y)
        const px = layout.x + x * layout.cell
        const py = layout.y + y * layout.cell
        const cell = currentBoard[index]
        const target = solution[index]
        const wrongInk = cell === INK && !target
        const missingInk = cell !== INK && target

        ctx.fillStyle = 'rgba(4, 11, 16, 0.82)'
        ctx.fillRect(px, py, layout.cell, layout.cell)

        if (target && solvedPulseRef.current > 0) {
          ctx.fillStyle = `rgba(255, 225, 130, ${0.08 + solvedPulseRef.current * 0.2})`
          ctx.fillRect(px + 2, py + 2, layout.cell - 4, layout.cell - 4)
        }

        if (cell === INK) {
          const glow = wrongInk && checkPulseRef.current > 0 ? '255, 82, 110' : '102, 255, 204'
          ctx.fillStyle = `rgba(${glow}, ${wrongInk ? 0.74 : 0.82})`
          ctx.fillRect(px + 3, py + 3, layout.cell - 6, layout.cell - 6)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
          ctx.fillRect(px + 5, py + 5, Math.max(2, layout.cell - 12), 2)
        }

        if (cell === MARK) {
          ctx.strokeStyle = 'rgba(255, 210, 122, 0.62)'
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.moveTo(px + 5, py + 5)
          ctx.lineTo(px + layout.cell - 5, py + layout.cell - 5)
          ctx.moveTo(px + layout.cell - 5, py + 5)
          ctx.lineTo(px + 5, py + layout.cell - 5)
          ctx.stroke()
        }

        if (checkPulseRef.current > 0 && missingInk) {
          ctx.strokeStyle = `rgba(255, 238, 160, ${checkPulseRef.current * 0.5})`
          ctx.lineWidth = 2
          ctx.strokeRect(px + 4, py + 4, layout.cell - 8, layout.cell - 8)
        }

        ctx.strokeStyle = (x % 5 === 4 || y % 5 === 4) ? 'rgba(102,255,204,0.22)' : 'rgba(102,255,204,0.1)'
        ctx.lineWidth = (x % 5 === 4 || y % 5 === 4) ? 1.4 : 1
        ctx.strokeRect(px, py, layout.cell, layout.cell)
      }
    }
    ctx.restore()

    if (solvedPulseRef.current > 0) {
      const cx = layout.x + layout.gridW / 2
      const cy = layout.y + layout.gridH / 2
      const radius = (1 - solvedPulseRef.current) * Math.max(layout.gridW, layout.gridH) * 0.55
      ctx.save()
      ctx.strokeStyle = `rgba(255, 238, 160, ${solvedPulseRef.current * 0.6})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
      solvedPulseRef.current = Math.max(0, solvedPulseRef.current - 0.012)
    }

    if (checkPulseRef.current > 0) {
      checkPulseRef.current = Math.max(0, checkPulseRef.current - 0.018)
    }
  }, [clues, ctx, dimensions, glyph.label, proofState, revision, solution])

  useEffect(() => {
    if (!ctx || dimensions.width === 0) return
    let frameId
    const animate = () => {
      drawScene()
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [ctx, dimensions.width, drawScene])

  const controls = useMemo(() => [
    {
      id: 'next',
      label: 'glyph.next()',
      onClick: nextGlyph
    },
    {
      id: 'check',
      label: 'check.proof()',
      onClick: checkProof,
      active: proofState === 'solved'
    },
    {
      id: 'reveal',
      label: 'reveal.cell()',
      onClick: revealCell
    },
    {
      id: 'clear',
      label: 'clear.board()',
      onClick: clearBoard,
      variant: 'reset'
    }
  ], [checkProof, clearBoard, nextGlyph, proofState, revealCell])

  const metrics = useMemo(() => [
    { label: 'glyph', value: glyph.label },
    { label: 'inked', value: stats.inked },
    { label: 'marks', value: stats.marks },
    { label: 'wrong', value: stats.wrong, color: stats.wrong ? '#ff6688' : undefined },
    { label: 'missing', value: stats.missing },
    { label: 'state', value: stats.solved ? 'solved' : proofState }
  ], [glyph.label, proofState, stats])

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
          onModeChange={(nextMode) => {
            setMode(nextMode)
            setMessage(
              nextMode === 'ink'
                ? 'ink cells that must exist'
                : nextMode === 'mark'
                ? 'mark cells you believe must stay absent'
                : 'erase uncertainty until the silhouette breathes'
            )
          }}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs sm:text-right max-w-lg">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onPointerLeave={endPointer}
          data-testid="negative-space-canvas"
        />
      </div>
    </div>
  )
}

export default NegativeSpace
