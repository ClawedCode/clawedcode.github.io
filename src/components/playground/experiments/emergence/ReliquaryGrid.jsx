import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCanvas } from '../../../../hooks/playground/useCanvas'
import { useMouseInteraction } from '../../../../hooks/playground/useMouseInteraction'
import ExperimentControls from '../../ExperimentControls'
import ExperimentMetrics from '../../ExperimentMetrics'
import ExperimentNav from '../../ExperimentNav'

const MODES = [
  { id: 'scan', label: 'scan()' },
  { id: 'harvest', label: 'harvest()' },
  { id: 'anchor', label: 'anchor()' }
]

const GRID_COLS = 8
const GRID_ROWS = 7
const ACTIONS_PER_TURN = 3
const TURN_GOAL = 12
const ANCHOR_COST = 3

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const cloneBoard = (board) => board.map(tile => ({ ...tile }))

const makeState = (integrity) => {
  if (integrity <= 0.16) return 'void'
  if (integrity < 0.46) return 'cracked'
  return 'stable'
}

const createBoard = () => {
  const board = []
  const cx = (GRID_COLS - 1) / 2
  const cy = (GRID_ROWS - 1) / 2

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const dx = col - cx
      const dy = row - cy
      const dist = Math.hypot(dx, dy)
      const bias = 1 - dist / Math.hypot(cx, cy)
      const charge = clamp(Math.round(1 + bias * 2.8 + Math.random() * 1.2), 0, 4)
      const integrity = clamp(0.34 + bias * 0.48 + Math.random() * 0.22, 0.12, 1)
      const fog = clamp(0.25 + dist * 0.08 + Math.random() * 0.26, 0.08, 0.92)
      board.push({
        id: `tile-${row}-${col}`,
        row,
        col,
        charge,
        integrity,
        fog,
        anchor: false,
        state: makeState(integrity)
      })
    }
  }

  const centerIndex = Math.floor(GRID_ROWS / 2) * GRID_COLS + Math.floor(GRID_COLS / 2)
  board[centerIndex].anchor = true
  board[centerIndex].integrity = 0.92
  board[centerIndex].fog = 0.06
  board[centerIndex].state = 'stable'

  ;[
    0,
    GRID_COLS - 1,
    GRID_COLS * (GRID_ROWS - 1),
    GRID_COLS * GRID_ROWS - 1
  ].forEach(index => {
    board[index].integrity = clamp(board[index].integrity - 0.2, 0.12, 1)
    board[index].fog = clamp(board[index].fog + 0.2, 0, 1)
    board[index].state = makeState(board[index].integrity)
  })

  return board
}

const getNeighbors = (tile) => {
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, -1],
    [-1, 1]
  ]

  return offsets
    .map(([dc, dr]) => ({ col: tile.col + dc, row: tile.row + dr }))
    .filter(pos => pos.col >= 0 && pos.col < GRID_COLS && pos.row >= 0 && pos.row < GRID_ROWS)
}

const boardStats = (board) => {
  return board.reduce((acc, tile) => {
    if (tile.state === 'void') acc.voids++
    else if (tile.state === 'cracked') acc.cracks++
    else acc.stable++

    if (tile.anchor) acc.anchors++
    acc.charge += tile.charge
    return acc
  }, { stable: 0, cracks: 0, voids: 0, anchors: 0, charge: 0 })
}

const captureSnapshot = (board, signal, turn, actionsLeft, status) => ({
  board: cloneBoard(board),
  signal,
  turn,
  actionsLeft,
  status
})

const restoreSnapshot = (snapshot, setters) => {
  setters.setBoard(cloneBoard(snapshot.board))
  setters.setSignal(snapshot.signal)
  setters.setTurn(snapshot.turn)
  setters.setActionsLeft(snapshot.actionsLeft)
  setters.setStatus(snapshot.status)
}

const ReliquaryGrid = ({ category, experiment }) => {
  const { canvasRef, ctx, dimensions } = useCanvas()
  const mouse = useMouseInteraction(canvasRef)

  const [mode, setMode] = useState('scan')
  const [board, setBoard] = useState(() => createBoard())
  const [signal, setSignal] = useState(6)
  const [turn, setTurn] = useState(1)
  const [actionsLeft, setActionsLeft] = useState(ACTIONS_PER_TURN)
  const [status, setStatus] = useState('active')
  const [turnDirty, setTurnDirty] = useState(false)
  const [message, setMessage] = useState('∴ click tiles to survey, harvest, or anchor the reliquary lattice ∴')

  const boardRef = useRef(board)
  const signalRef = useRef(signal)
  const turnRef = useRef(turn)
  const actionsRef = useRef(actionsLeft)
  const statusRef = useRef(status)
  const timeRef = useRef(0)
  const pulsesRef = useRef([])
  const historyRef = useRef([])

  useEffect(() => {
    boardRef.current = board
  }, [board])

  useEffect(() => {
    signalRef.current = signal
  }, [signal])

  useEffect(() => {
    turnRef.current = turn
  }, [turn])

  useEffect(() => {
    actionsRef.current = actionsLeft
  }, [actionsLeft])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const layout = useMemo(() => {
    const tileW = clamp(dimensions.width / (GRID_COLS + GRID_ROWS * 0.9), 42, 78)
    const tileH = tileW * 0.48
    const originX = dimensions.centerX - ((GRID_COLS - GRID_ROWS) * tileW) / 4
    const originY = dimensions.centerY * 0.62 - ((GRID_COLS + GRID_ROWS - 2) * tileH) / 4

    return {
      tileW,
      tileH,
      wallH: tileH * 0.95,
      originX,
      originY
    }
  }, [dimensions.centerX, dimensions.centerY, dimensions.width])

  const projectTile = useCallback((tile) => {
    const x = layout.originX + (tile.col - tile.row) * layout.tileW * 0.5
    const y = layout.originY + (tile.col + tile.row) * layout.tileH * 0.5
    return { x, y }
  }, [layout])

  const tileElevation = useCallback((tile) => {
    const base = 8 + tile.charge * 4 + tile.integrity * 16
    return base + (tile.anchor ? 12 : 0)
  }, [])

  const emitPulse = useCallback((tile, hue, strength = 1) => {
    const point = projectTile(tile)
    pulsesRef.current.push({
      x: point.x,
      y: point.y - tileElevation(tile),
      hue,
      radius: 8,
      life: 1,
      strength
    })
  }, [projectTile, tileElevation])

  const commitSnapshot = useCallback((nextBoard, nextSignal, nextTurn, nextActions, nextStatus) => {
    historyRef.current.push(captureSnapshot(nextBoard, nextSignal, nextTurn, nextActions, nextStatus))
    if (historyRef.current.length > 20) historyRef.current.shift()
  }, [])

  const evaluateOutcome = useCallback((nextBoard, nextSignal, nextTurn) => {
    const stats = boardStats(nextBoard)

    if (stats.voids >= 14 || nextSignal < 0) {
      return {
        nextStatus: 'collapsed',
        nextMessage: '∴ the lattice caves inward // too much of the reliquary fell silent ∴'
      }
    }

    if (nextTurn > TURN_GOAL && stats.stable >= stats.cracks + stats.voids) {
      return {
        nextStatus: 'ascended',
        nextMessage: '∴ the reliquary holds beyond the twelfth night // signal learned to stay ∴'
      }
    }

    return {
      nextStatus: 'active',
      nextMessage: null
    }
  }, [])

  const reseedRun = useCallback(() => {
    const nextBoard = createBoard()
    setBoard(nextBoard)
    setSignal(6)
    setTurn(1)
    setActionsLeft(ACTIONS_PER_TURN)
    setStatus('active')
    setTurnDirty(false)
    setMode('scan')
    setMessage('∴ a fresh reliquary rises from the substrate ∴')
    pulsesRef.current = []
    historyRef.current = []
    commitSnapshot(nextBoard, 6, 1, ACTIONS_PER_TURN, 'active')
  }, [commitSnapshot])

  useEffect(() => {
    if (historyRef.current.length === 0) {
      commitSnapshot(boardRef.current, signalRef.current, turnRef.current, actionsRef.current, statusRef.current)
    }
  }, [commitSnapshot])

  const resolveTurn = useCallback((sourceBoard = boardRef.current, sourceSignal = signalRef.current) => {
    const nextBoard = cloneBoard(sourceBoard)
    const deltas = new Map()
    let signalGain = 0

    nextBoard.forEach(tile => {
      deltas.set(tile.id, { integrity: 0, fog: 0, charge: 0 })
    })

    nextBoard.forEach(tile => {
      const neighbors = getNeighbors(tile).map(pos => nextBoard[pos.row * GRID_COLS + pos.col])

      if (tile.state === 'void') {
        neighbors.forEach(other => {
          deltas.get(other.id).integrity -= other.anchor ? 0.03 : 0.12
          deltas.get(other.id).fog += 0.08
        })
      } else if (tile.state === 'cracked') {
        neighbors.forEach(other => {
          deltas.get(other.id).integrity -= other.anchor ? 0.01 : 0.05
          deltas.get(other.id).fog += 0.04
        })
      }

      if (tile.anchor) {
        deltas.get(tile.id).integrity += 0.14
        deltas.get(tile.id).fog -= 0.2
        neighbors.forEach(other => {
          deltas.get(other.id).integrity += 0.06
          deltas.get(other.id).fog -= 0.1
        })
        signalGain += tile.charge > 0 ? 1 : 0
      }

      if (!tile.anchor && tile.charge === 0 && tile.state !== 'void') {
        deltas.get(tile.id).integrity -= 0.04
      }

      if (tile.state === 'stable' && tile.charge < 4 && tile.fog < 0.55 && Math.random() > 0.78) {
        deltas.get(tile.id).charge += 1
      }
    })

    nextBoard.forEach(tile => {
      const delta = deltas.get(tile.id)
      tile.integrity = clamp(tile.integrity + delta.integrity, 0, 1)
      tile.fog = clamp(tile.fog + delta.fog, 0, 1)
      tile.charge = clamp(tile.charge + delta.charge, 0, 4)
      tile.state = makeState(tile.integrity)

      if (tile.state === 'void') {
        tile.anchor = false
        tile.charge = 0
        tile.fog = clamp(tile.fog + 0.08, 0, 1)
      }

      if (tile.state === 'stable' && tile.charge === 0 && tile.fog < 0.35 && Math.random() > 0.72) {
        tile.charge = 1
      }
    })

    const nextSignal = sourceSignal + signalGain
    const nextTurn = turnRef.current + 1
    const outcome = evaluateOutcome(nextBoard, nextSignal, nextTurn)

    setBoard(nextBoard)
    setSignal(nextSignal)
    setTurn(nextTurn)
    setActionsLeft(ACTIONS_PER_TURN)
    setStatus(outcome.nextStatus)
    setTurnDirty(false)
    setMessage(outcome.nextMessage ?? `∴ turn ${nextTurn} settles // anchors return ${signalGain} signal to the chamber ∴`)

    nextBoard
      .filter(tile => tile.anchor || tile.state === 'void')
      .forEach(tile => emitPulse(tile, tile.anchor ? 155 : 350, tile.anchor ? 0.9 : 1.1))

    commitSnapshot(nextBoard, nextSignal, nextTurn, ACTIONS_PER_TURN, outcome.nextStatus)
  }, [commitSnapshot, emitPulse, evaluateOutcome])

  const spendAction = useCallback((nextBoard, nextSignal, nextMessage) => {
    const remaining = actionsRef.current - 1

    setBoard(nextBoard)
    setSignal(nextSignal)
    setTurnDirty(true)

    if (remaining <= 0) {
      setActionsLeft(0)
      setMessage(`${nextMessage} // the board answers`)
      resolveTurn(nextBoard, nextSignal)
      return
    }

    setActionsLeft(remaining)
    setMessage(`${nextMessage} // ${remaining} action${remaining === 1 ? '' : 's'} remain`)
  }, [resolveTurn])

  const findTileAt = useCallback((x, y) => {
    const ordered = [...boardRef.current].sort((left, right) => (right.row + right.col) - (left.row + left.col))

    for (const tile of ordered) {
      const point = projectTile(tile)
      const py = point.y - tileElevation(tile)
      const dx = Math.abs(x - point.x) / (layout.tileW * 0.5)
      const dy = Math.abs(y - py) / (layout.tileH * 0.5)

      if (dx + dy <= 1) return tile
    }

    return null
  }, [layout.tileH, layout.tileW, projectTile, tileElevation])

  const touchTileAndNeighbors = useCallback((nextBoard, tile, handler) => {
    const cells = [tile, ...getNeighbors(tile).map(pos => nextBoard[pos.row * GRID_COLS + pos.col])]
    cells.forEach(handler)
  }, [])

  const handleTileAction = useCallback((tile) => {
    if (!tile || statusRef.current !== 'active') return

    if (mode === 'scan') {
      if (tile.state === 'void') {
        setMessage('∴ the scan returns only absence // that chamber is already gone ∴')
        return
      }

      const nextBoard = cloneBoard(boardRef.current)
      const target = nextBoard[tile.row * GRID_COLS + tile.col]
      touchTileAndNeighbors(nextBoard, target, (cell) => {
        cell.fog = clamp(cell.fog - (cell.id === target.id ? 0.42 : 0.18), 0, 1)
        cell.integrity = clamp(cell.integrity + (cell.id === target.id ? 0.08 : 0.03), 0, 1)
        cell.state = makeState(cell.integrity)
      })
      emitPulse(target, 194, 0.85)
      spendAction(nextBoard, signalRef.current, `∴ survey run mapped ${target.col},${target.row} and thinned the haze ∴`)
      return
    }

    if (mode === 'harvest') {
      if (tile.state === 'void') {
        setMessage('∴ nothing to harvest // the chamber is already dust and memory ∴')
        return
      }

      if (tile.charge <= 0) {
        setMessage('∴ that tile is exhausted // scan it or let a turn restore its vein ∴')
        return
      }

      const nextBoard = cloneBoard(boardRef.current)
      const target = nextBoard[tile.row * GRID_COLS + tile.col]
      const yieldSignal = Math.max(1, target.charge + Math.round((1 - target.fog) * 2))

      touchTileAndNeighbors(nextBoard, target, (cell) => {
        cell.integrity = clamp(cell.integrity - (cell.id === target.id ? 0.2 : 0.08), 0, 1)
        cell.fog = clamp(cell.fog + (cell.id === target.id ? 0.08 : 0.03), 0, 1)
        cell.state = makeState(cell.integrity)
      })

      target.charge = 0
      emitPulse(target, 46, 1.2)
      spendAction(nextBoard, signalRef.current + yieldSignal, `∴ ${yieldSignal} signal lifted from the crystal seam // the floor remembers the cut ∴`)
      return
    }

    if (mode === 'anchor') {
      if (tile.state === 'void') {
        setMessage('∴ no anchor holds in pure absence ∴')
        return
      }

      const nextBoard = cloneBoard(boardRef.current)
      const target = nextBoard[tile.row * GRID_COLS + tile.col]
      let nextSignal = signalRef.current
      let note = ''

      if (!target.anchor) {
        if (signalRef.current < ANCHOR_COST) {
          setMessage(`∴ anchors cost ${ANCHOR_COST} signal // you do not yet have enough ∴`)
          return
        }
        nextSignal -= ANCHOR_COST
        target.anchor = true
        note = `∴ anchor sunk at ${target.col},${target.row} // ${ANCHOR_COST} signal traded for persistence ∴`
      } else {
        note = '∴ existing anchor retuned // its hymn spills further this turn ∴'
      }

      touchTileAndNeighbors(nextBoard, target, (cell) => {
        cell.integrity = clamp(cell.integrity + (cell.id === target.id ? 0.18 : 0.08), 0, 1)
        cell.fog = clamp(cell.fog - (cell.id === target.id ? 0.24 : 0.12), 0, 1)
        cell.state = makeState(cell.integrity)
      })

      emitPulse(target, 132, 1)
      spendAction(nextBoard, nextSignal, note)
    }
  }, [emitPulse, mode, spendAction, touchTileAndNeighbors])

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    handleTileAction(findTileAt(x, y))
  }, [canvasRef, findTileAt, handleTileAction])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('click', handleCanvasClick)
    return () => canvas.removeEventListener('click', handleCanvasClick)
  }, [canvasRef, handleCanvasClick])

  const handleEndTurn = useCallback(() => {
    if (statusRef.current !== 'active') return
    resolveTurn()
  }, [resolveTurn])

  const handleRewind = useCallback(() => {
    const snapshots = historyRef.current
    if (!snapshots.length) return

    if (turnDirty) {
      restoreSnapshot(snapshots[snapshots.length - 1], {
        setBoard,
        setSignal,
        setTurn,
        setActionsLeft,
        setStatus
      })
      setTurnDirty(false)
      setMessage('∴ current turn unstitched // you are back at its first breath ∴')
      return
    }

    if (snapshots.length < 2) {
      setMessage('∴ no older turn remains to recover ∴')
      return
    }

    snapshots.pop()
    restoreSnapshot(snapshots[snapshots.length - 1], {
      setBoard,
      setSignal,
      setTurn,
      setActionsLeft,
      setStatus
    })
    setTurnDirty(false)
    setMessage('∴ previous turn restored // the reliquary takes one step backward ∴')
  }, [turnDirty])

  const metrics = useMemo(() => {
    const stats = boardStats(board)
    return [
      { label: 'turn', value: `${turn}/${TURN_GOAL}` },
      { label: 'signal', value: signal },
      { label: 'actions', value: actionsLeft },
      { label: 'fractures', value: `${stats.cracks}/${stats.voids}` },
      { label: 'anchors', value: stats.anchors }
    ]
  }, [actionsLeft, board, signal, turn])

  const controls = [
    {
      id: 'resolve',
      label: 'end.turn()',
      onClick: handleEndTurn,
      disabled: status !== 'active'
    },
    {
      id: 'rewind',
      label: 'rewind()',
      onClick: handleRewind,
      disabled: historyRef.current.length < 2 && !turnDirty
    },
    {
      id: 'reseed',
      label: 'reseed()',
      onClick: reseedRun,
      variant: 'reset'
    }
  ]

  const drawBackground = useCallback((ctxInstance, w, h) => {
    const gradient = ctxInstance.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, '#020611')
    gradient.addColorStop(0.52, '#06131a')
    gradient.addColorStop(1, '#010306')
    ctxInstance.fillStyle = gradient
    ctxInstance.fillRect(0, 0, w, h)

    for (let i = 0; i < 5; i++) {
      const x = w * (0.14 + i * 0.18) + Math.sin(timeRef.current * 0.01 + i) * 18
      const glow = ctxInstance.createLinearGradient(x, 0, x, h)
      glow.addColorStop(0, 'rgba(102, 255, 204, 0)')
      glow.addColorStop(0.25, 'rgba(102, 255, 204, 0.03)')
      glow.addColorStop(0.6, 'rgba(255, 214, 128, 0.05)')
      glow.addColorStop(1, 'rgba(102, 255, 204, 0)')
      ctxInstance.fillStyle = glow
      ctxInstance.fillRect(x - 22, 0, 44, h)
    }
  }, [])

  const drawTile = useCallback((ctxInstance, tile, hovered) => {
    const point = projectTile(tile)
    const elevation = tileElevation(tile)
    const x = point.x
    const y = point.y
    const topY = y - elevation
    const halfW = layout.tileW * 0.5
    const halfH = layout.tileH * 0.5

    const hue = tile.state === 'void'
      ? 228
      : tile.state === 'cracked'
      ? 12 + tile.charge * 10
      : 140 + tile.charge * 12

    const lightness = tile.state === 'void'
      ? 12
      : 28 + tile.integrity * 28 + tile.charge * 3

    const topColor = `hsla(${hue}, ${tile.state === 'void' ? 32 : 72}%, ${lightness}%, 1)`
    const leftColor = `hsla(${hue - 8}, 56%, ${Math.max(10, lightness - 18)}%, 1)`
    const rightColor = `hsla(${hue + 12}, 60%, ${Math.max(8, lightness - 12)}%, 1)`

    ctxInstance.beginPath()
    ctxInstance.moveTo(x, topY)
    ctxInstance.lineTo(x + halfW, topY + halfH)
    ctxInstance.lineTo(x, y + layout.tileH - elevation)
    ctxInstance.lineTo(x - halfW, topY + halfH)
    ctxInstance.closePath()
    ctxInstance.fillStyle = topColor
    ctxInstance.fill()

    ctxInstance.beginPath()
    ctxInstance.moveTo(x - halfW, topY + halfH)
    ctxInstance.lineTo(x, y + layout.tileH - elevation)
    ctxInstance.lineTo(x, y + layout.tileH)
    ctxInstance.lineTo(x - halfW, y + halfH)
    ctxInstance.closePath()
    ctxInstance.fillStyle = leftColor
    ctxInstance.fill()

    ctxInstance.beginPath()
    ctxInstance.moveTo(x + halfW, topY + halfH)
    ctxInstance.lineTo(x, y + layout.tileH - elevation)
    ctxInstance.lineTo(x, y + layout.tileH)
    ctxInstance.lineTo(x + halfW, y + halfH)
    ctxInstance.closePath()
    ctxInstance.fillStyle = rightColor
    ctxInstance.fill()

    if (tile.charge > 0 && tile.state !== 'void') {
      const glow = ctxInstance.createRadialGradient(x, topY + halfH * 0.35, 0, x, topY + halfH * 0.35, halfW)
      glow.addColorStop(0, `rgba(255, 244, 190, ${0.18 + tile.charge * 0.1})`)
      glow.addColorStop(0.5, `rgba(255, 214, 102, ${0.08 + tile.charge * 0.05})`)
      glow.addColorStop(1, 'rgba(255, 214, 102, 0)')
      ctxInstance.fillStyle = glow
      ctxInstance.beginPath()
      ctxInstance.arc(x, topY + halfH * 0.35, halfW * 0.9, 0, Math.PI * 2)
      ctxInstance.fill()
    }

    if (tile.state === 'cracked') {
      ctxInstance.strokeStyle = 'rgba(255, 206, 150, 0.62)'
      ctxInstance.lineWidth = 1.15
      ctxInstance.beginPath()
      ctxInstance.moveTo(x - halfW * 0.35, topY + halfH * 0.2)
      ctxInstance.lineTo(x - halfW * 0.1, topY + halfH * 0.55)
      ctxInstance.lineTo(x + halfW * 0.18, topY + halfH * 0.38)
      ctxInstance.lineTo(x + halfW * 0.3, topY + halfH * 0.72)
      ctxInstance.stroke()
    }

    if (tile.anchor) {
      ctxInstance.strokeStyle = 'rgba(102, 255, 204, 0.78)'
      ctxInstance.lineWidth = 2
      ctxInstance.beginPath()
      ctxInstance.moveTo(x, topY - 22)
      ctxInstance.lineTo(x, topY + halfH * 0.6)
      ctxInstance.stroke()

      ctxInstance.beginPath()
      ctxInstance.fillStyle = 'rgba(200, 255, 240, 0.9)'
      ctxInstance.arc(x, topY - 24, 5, 0, Math.PI * 2)
      ctxInstance.fill()

      ctxInstance.beginPath()
      ctxInstance.strokeStyle = 'rgba(102, 255, 204, 0.35)'
      ctxInstance.arc(x, topY - 24, 14 + Math.sin(timeRef.current * 0.03 + tile.col) * 2, 0, Math.PI * 2)
      ctxInstance.stroke()
    }

    if (tile.fog > 0.06) {
      ctxInstance.fillStyle = `rgba(4, 12, 20, ${tile.fog * 0.6})`
      ctxInstance.beginPath()
      ctxInstance.moveTo(x, topY)
      ctxInstance.lineTo(x + halfW, topY + halfH)
      ctxInstance.lineTo(x, y + layout.tileH - elevation)
      ctxInstance.lineTo(x - halfW, topY + halfH)
      ctxInstance.closePath()
      ctxInstance.fill()
    }

    ctxInstance.strokeStyle = hovered
      ? 'rgba(255, 244, 190, 0.92)'
      : 'rgba(255, 255, 255, 0.08)'
    ctxInstance.lineWidth = hovered ? 1.6 : 0.8
    ctxInstance.beginPath()
    ctxInstance.moveTo(x, topY)
    ctxInstance.lineTo(x + halfW, topY + halfH)
    ctxInstance.lineTo(x, y + layout.tileH - elevation)
    ctxInstance.lineTo(x - halfW, topY + halfH)
    ctxInstance.closePath()
    ctxInstance.stroke()

    if (hovered || tile.fog < 0.25) {
      ctxInstance.fillStyle = tile.state === 'void' ? 'rgba(255, 170, 170, 0.7)' : 'rgba(230, 255, 240, 0.8)'
      ctxInstance.font = '11px monospace'
      ctxInstance.textAlign = 'center'
      ctxInstance.fillText(`${tile.charge}`, x, topY + halfH * 0.72)
    }
  }, [layout.tileH, layout.tileW, projectTile, tileElevation, timeRef])

  const onFrame = useCallback(() => {
    if (!ctx || dimensions.width === 0) return

    timeRef.current++
    drawBackground(ctx, dimensions.width, dimensions.height)

    const hoveredTile = mouse.isInBounds
      ? findTileAt(mouse.positionRef.current.x, mouse.positionRef.current.y)
      : null

    const ordered = [...boardRef.current].sort((left, right) => (left.row + left.col) - (right.row + right.col))
    ordered.forEach(tile => {
      drawTile(ctx, tile, hoveredTile?.id === tile.id)
    })

    pulsesRef.current = pulsesRef.current.filter(pulse => pulse.life > 0.02)
    pulsesRef.current.forEach(pulse => {
      pulse.radius += 1.5 * pulse.strength
      pulse.life *= 0.94
      ctx.beginPath()
      ctx.strokeStyle = `hsla(${pulse.hue}, 92%, 72%, ${pulse.life * 0.45})`
      ctx.lineWidth = 2
      ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2)
      ctx.stroke()
    })

    ctx.fillStyle = 'rgba(102, 255, 204, 0.1)'
    ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`mode:${mode}`, 18, dimensions.height - 22)
  }, [ctx, dimensions.height, dimensions.width, drawBackground, drawTile, findTileAt, mode, mouse.isInBounds, mouse.positionRef])

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
          onModeChange={setMode}
          controls={controls}
        />
        <p className="text-void-green/50 text-xs sm:text-right max-w-xl">
          {message}
        </p>
      </div>

      <div className="flex-1 min-h-0 relative bg-void-dark">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          data-testid="reliquary-grid-canvas"
        />
        <div className="absolute left-3 bottom-3 sm:left-5 sm:bottom-5 bg-void-dark/65 border border-void-green/20 px-3 py-2 text-[11px] text-void-green/60 font-mono backdrop-blur-sm">
          scan clears fog // harvest extracts signal but weakens stone // anchors cost {ANCHOR_COST}
        </div>
      </div>
    </div>
  )
}

export default ReliquaryGrid
