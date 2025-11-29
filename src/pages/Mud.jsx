import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMUD, ITEMS, READABLES } from '../hooks/useMUD'
import { useMultiplayer } from '../hooks/useMultiplayer'

// ASCII Map Component
const AsciiMap = ({ world, player, discovered, mapUnlocked }) => {
  const [fullscreen, setFullscreen] = useState(false)

  const levelNames = { '-1': 'Sublevel', '0': 'Main Deck', '1': 'Upper Deck' }
  const currentZ = world[player.location]?.coords?.z || 0

  const renderLevel = useCallback((zLevel, showAll = false) => {
    const rooms = Object.entries(world).filter(([, r]) => r.coords?.z === zLevel)
    if (rooms.length === 0) return null

    const coords = rooms.map(([, r]) => r.coords)
    const minX = Math.min(...coords.map(c => c.x))
    const maxX = Math.max(...coords.map(c => c.x))
    const minY = Math.min(...coords.map(c => c.y))
    const maxY = Math.max(...coords.map(c => c.y))

    const keyByCoord = {}
    rooms.forEach(([key, room]) => {
      keyByCoord[`${room.coords.x},${room.coords.y}`] = key
    })

    const lines = []
    for (let y = maxY; y >= minY; y--) {
      let row = ''
      for (let x = minX; x <= maxX; x++) {
        const key = keyByCoord[`${x},${y}`]
        if (!key) {
          row += '       '
          continue
        }
        const room = world[key]
        const isDiscovered = mapUnlocked || discovered.has(key)
        const isPlayer = key === player.location
        const label = isDiscovered ? (room.abbr || '???') : '??'

        // Vertical exit indicators
        const hasUp = room.exits?.up
        const hasDown = room.exits?.down
        const vertInd = hasUp && hasDown ? '↕' : hasUp ? '↑' : hasDown ? '↓' : ''

        let cell
        if (isPlayer) {
          const display = vertInd ? `*${label.substring(0, 1)}${vertInd}` : `*${label.substring(0, 2)}`
          cell = `[${display.padEnd(3)}]`
        } else if (isDiscovered) {
          const display = vertInd ? `${label.substring(0, 2)}${vertInd}` : label.padEnd(3)
          cell = `[${display}]`
        } else {
          cell = `[${label.padEnd(3)}]`
        }
        row += ` ${cell} `
      }
      lines.push(row)

      // Add vertical connectors between rows
      if (y > minY) {
        let connRow = ''
        for (let x = minX; x <= maxX; x++) {
          const key = keyByCoord[`${x},${y}`]
          const southKey = keyByCoord[`${x},${y - 1}`]
          const room = key && world[key]
          const hasSouth = room?.exits?.south === southKey
          const isVisible = (mapUnlocked || discovered.has(key)) && (mapUnlocked || discovered.has(southKey))
          connRow += hasSouth && isVisible ? '   │   ' : '       '
        }
        lines.push(connRow)
      }
    }
    return lines
  }, [world, player.location, discovered, mapUnlocked])

  return (
    <div className={`card ${fullscreen ? 'fixed inset-4 z-50 overflow-auto bg-void-dark/95' : ''}`} data-testid="ascii-map">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-void-cyan text-sm">STATION MAP</h3>
        <button
          onClick={() => setFullscreen(!fullscreen)}
          className="text-void-cyan text-xs hover:text-void-green"
        >
          {fullscreen ? '⊟' : '⊞'}
        </button>
      </div>

      <div className="font-mono text-xs overflow-x-auto">
        {[1, 0, -1].map(z => {
          const lines = renderLevel(z)
          if (!lines) return null
          const isCurrent = z === currentZ
          return (
            <div key={z} className="mb-4">
              <div className={`text-center text-xs mb-1 ${isCurrent ? 'text-void-green font-bold' : 'text-void-cyan/60'}`}>
                ═══ {levelNames[String(z)]} ═══
              </div>
              <pre className="text-void-green/80 whitespace-pre text-center">
                {lines.map((line, i) => (
                  <div key={i} dangerouslySetInnerHTML={{
                    __html: line.replace(/\*([A-Z]{1,3}[↑↓↕]?)\]/g, '<span class="text-void-green font-bold">*$1]</span>')
                  }} />
                ))}
              </pre>
            </div>
          )
        })}
      </div>

      <div className="text-void-cyan/60 text-xs mt-2 border-t border-void-green/20 pt-2 text-center">
        <span className="text-void-green">*</span>=you | ↑↓=stairs
      </div>
    </div>
  )
}

// Enemy Card Component
const EnemyCard = ({ enemy, player, onAction }) => {
  if (!enemy) return null

  const hpPercent = enemy.maxHp ? Math.max(0, (enemy.hp / enemy.maxHp) * 100) : 100
  const hpColor = hpPercent > 50 ? 'bg-void-green' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
  const isScanned = enemy.scanned
  const canSurge = player.energy >= 3
  const canEvade = player.energy >= 4
  const canScan = player.energy >= 2
  const isInvulnerable = enemy.fearLight

  if (enemy.defeated) {
    return (
      <div className="bg-void-dark/60 border border-void-green/30 rounded p-3 opacity-70" data-testid="enemy-card-defeated">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-void-green/60 line-through">{enemy.name}</span>
          <span className="text-void-green/50 text-xs px-2 py-0.5 border border-void-green/30 rounded">
            ATK {enemy.attack}
          </span>
        </div>

        {/* HP Bar with DEFEATED overlay */}
        <div className="relative h-5 bg-void-dark border border-void-green/30 rounded mb-2">
          <div className="h-full bg-void-green/20 rounded" style={{ width: '0%' }} />
          <span className="absolute inset-0 flex items-center justify-center text-xs text-void-green font-mono font-bold">
            DEFEATED
          </span>
        </div>

        {/* Description */}
        <p className="text-void-green/40 text-xs italic">
          {enemy.desc || 'Threat neutralized.'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-red-950/40 border border-red-500/40 rounded p-3" data-testid="enemy-card">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-orange-400 font-bold">{enemy.name}</span>
        <span className={`text-red-400 text-xs px-2 py-0.5 border border-red-500/40 rounded ${!isScanned ? 'opacity-50' : ''}`}>
          ATK {isScanned ? enemy.attack : '???'}
        </span>
      </div>

      {/* HP Bar */}
      <div className="relative h-5 bg-void-dark border border-red-500/30 rounded mb-2">
        <div
          className={`h-full ${hpColor} transition-all rounded`}
          style={{ width: isScanned ? `${hpPercent}%` : '100%' }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs text-void-dark font-mono font-bold drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">
          {isScanned ? `${enemy.hp}/${enemy.maxHp} HP` : '???/??? HP'}
        </span>
      </div>

      {/* Description */}
      <p className="text-red-300/70 text-xs italic mb-3">
        {isScanned ? (enemy.desc || 'A hostile entity.') : 'Scan to analyze threat.'}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onAction('attack')}
          disabled={isInvulnerable}
          className="btn-small bg-red-900/50 border-red-500/50 text-red-300 hover:bg-red-800/50 disabled:opacity-40"
          data-testid="attack-btn"
        >
          {isInvulnerable ? '???' : 'attack'}
        </button>
        <button
          onClick={() => onAction('surge')}
          disabled={!canSurge}
          className="btn-small disabled:opacity-40"
          data-testid="surge-btn"
        >
          surge
        </button>
        <button
          onClick={() => onAction('evade')}
          disabled={!canEvade}
          className="btn-small disabled:opacity-40"
          data-testid="evade-btn"
        >
          evade
        </button>
        <button
          onClick={() => onAction('scan')}
          disabled={!canScan}
          className="btn-small disabled:opacity-40"
          data-testid="scan-btn"
        >
          scan
        </button>
      </div>
    </div>
  )
}

// Room Display with clickable elements
const RoomDisplay = ({ room, enemy, player, onTakeItem, onMove, onRead, onEnemyAction }) => {
  if (!room) return null

  const isDark = room.dark && !room.lit
  const roomDesc = (!room.dark && room.descLit) ? room.descLit : room.desc

  return (
    <div className="card mb-4" data-testid="room-display">
      <h2 className="text-void-green font-bold text-lg mb-2">{room.name}</h2>
      <p className="text-void-green/80 mb-3">
        {isDark ? 'Pitch darkness. You cannot see.' : roomDesc}
      </p>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Left side: Items, Terminal, Exits */}
        <div className="flex-1">
          {!isDark && room.items?.length > 0 && (
            <div className="mb-2">
              <span className="text-void-cyan text-sm">Items: </span>
              {room.items.map((id) => (
                <button
                  key={id}
                  onClick={() => onTakeItem(ITEMS[id]?.name)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 bg-void-dark border border-void-green/40 rounded text-void-green text-sm hover:bg-void-green/20 cursor-pointer"
                  title={ITEMS[id]?.desc}
                  data-testid={`item-${id}`}
                >
                  {ITEMS[id]?.icon} {ITEMS[id]?.name}
                </button>
              ))}
            </div>
          )}

          {!isDark && room.readable && (
            <div className="mb-2">
              <button
                onClick={onRead}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-void-dark border border-void-cyan/40 rounded text-void-cyan text-sm hover:bg-void-cyan/20 cursor-pointer"
                data-testid="read-terminal"
              >
                📟 {READABLES[room.readable]?.name}
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-void-cyan text-sm">Exits: </span>
            {Object.entries(room.exits || {}).map(([dir, exit]) => {
              const isLocked = typeof exit === 'object' && exit.requires
              const targetRoom = typeof exit === 'string' ? exit : exit?.room
              return (
                <button
                  key={dir}
                  onClick={() => onMove(dir)}
                  className="px-2 py-0.5 bg-void-dark border border-blue-400/40 rounded text-blue-300 text-sm hover:bg-blue-400/20 cursor-pointer"
                  title={targetRoom}
                  data-testid={`exit-${dir}`}
                >
                  {isLocked ? '🔒' : ''}{dir.toUpperCase()}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right side: Enemy Card */}
        {enemy && (
          <div className="md:w-72 flex-shrink-0">
            <EnemyCard enemy={enemy} player={player} onAction={onEnemyAction} />
          </div>
        )}
      </div>
    </div>
  )
}

const Mud = () => {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState([])
  const [confirmReset, setConfirmReset] = useState(false)
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('voidMudHandle') || '')
  const [handleInput, setHandleInput] = useState('')
  const [gameStarted, setGameStarted] = useState(() => !!localStorage.getItem('voidMudHandle'))
  const inputRef = useRef(null)
  const handleInputRef = useRef(null)
  const scrollContainerRef = useRef(null)

  // Focus handle input on mount if no handle set
  useEffect(() => {
    if (!gameStarted && handleInputRef.current) {
      handleInputRef.current.focus()
    }
  }, [gameStarted])

  const startGame = useCallback((handle) => {
    const normalized = handle.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 16) || `void-${Math.random().toString(36).substr(2, 6)}`
    localStorage.setItem('voidMudHandle', normalized)
    setPlayerName(normalized)
    setGameStarted(true)
  }, [])

  const handleOutput = useCallback((line) => {
    setOutput(prev => [...prev, line])
  }, [])

  const {
    player,
    world,
    discovered,
    gameOver,
    victory,
    mapUnlocked,
    handleCommand,
    getCurrentRoom
  } = useMUD(handleOutput, playerName)

  // Handle multiplayer messages
  const handleMultiplayerMessage = useCallback((msg) => {
    if (msg.type === 'chat') {
      setOutput(prev => [...prev, { text: `[${msg.from}] ${msg.message}`, type: 'system' }])
    }
  }, [])

  const {
    linkCode,
    voidmates,
    connectionStatus,
    peerCount,
    connect,
    connectToPeer,
    sendChat,
    broadcastLocation
  } = useMultiplayer(playerName, player.location, handleMultiplayerMessage)

  // Connect to mesh on mount (empty deps - only run once)
  const connectCalledRef = useRef(false)
  useEffect(() => {
    if (connectCalledRef.current) return
    connectCalledRef.current = true
    connect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Show link code when connected
  useEffect(() => {
    if (linkCode) {
      setOutput(prev => [
        ...prev,
        { text: 'Connected to P2P mesh (STUN-only, some peers may be unreachable)', type: 'system' },
        { text: `Your link code: ${linkCode}`, type: 'system' },
        { text: 'Share with voidmates or use: link <code>', type: 'system' }
      ])
    }
  }, [linkCode])

  // Broadcast location changes
  useEffect(() => {
    if (linkCode) {
      broadcastLocation(player.location)
    }
  }, [player.location, linkCode, broadcastLocation])

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [output])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Process command result (handles special actions like link, say, reset)
  const processCommandResult = useCallback((result) => {
    if (result === 'confirm-reset') {
      setOutput(prev => [...prev, { text: 'Reset all progress? This cannot be undone.', type: 'system' }])
      setConfirmReset(true)
    } else if (result?.action === 'link') {
      const linkResult = connectToPeer(result.code)
      if (linkResult.success) {
        setOutput(prev => [...prev, { text: `Linking to voidmate: ${result.code}...`, type: 'system' }])
      } else {
        setOutput(prev => [...prev, { text: linkResult.error, type: 'error' }])
      }
    } else if (result?.action === 'say') {
      if (peerCount === 0) {
        setOutput(prev => [...prev, { text: 'No voidmates connected. Share your link code to connect.', type: 'error' }])
      } else {
        sendChat(result.message)
        setOutput(prev => [...prev, { text: `[you] ${result.message}`, type: 'system' }])
      }
    }
  }, [connectToPeer, sendChat, peerCount])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim()) return

    setOutput(prev => [...prev, { text: `> ${input}`, type: 'input' }])
    const result = handleCommand(input)
    processCommandResult(result)
    setInput('')
  }

  const executeCommand = useCallback((cmd) => {
    setOutput(prev => [...prev, { text: `> ${cmd}`, type: 'input' }])
    const result = handleCommand(cmd)
    processCommandResult(result)
  }, [handleCommand, processCommandResult])

  const handleResetConfirm = useCallback((confirmed) => {
    setConfirmReset(false)
    if (confirmed) {
      setOutput([]) // Clear terminal output
      handleCommand('confirm-reset')
      // Also clear handle to allow re-entry
      localStorage.removeItem('voidMudHandle')
      setPlayerName('')
      setGameStarted(false)
    } else {
      setOutput(prev => [...prev, { text: 'Reset cancelled.', type: 'system' }])
    }
  }, [handleCommand])

  const room = getCurrentRoom()

  // Inventory display with quantities
  const inventoryItems = useMemo(() => {
    return player.inventory.map(entry => {
      const item = ITEMS[entry.id]
      return { ...entry, item }
    })
  }, [player.inventory])

  // Handle entry screen
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-void-dark flex flex-col items-center justify-center p-4">
        <div className="card max-w-md w-full text-center space-y-6">
          <h1 className="text-void-green text-glow text-2xl">VOID MUD</h1>
          <p className="text-void-cyan">A text adventure in the liminal void</p>
          <div className="border-t border-void-green/30 pt-6">
            <p className="text-void-green/70 text-sm mb-4">Choose your handle, wanderer:</p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                startGame(handleInput)
              }}
              className="space-y-4"
            >
              <input
                ref={handleInputRef}
                type="text"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                placeholder="void-walker"
                maxLength={16}
                className="w-full bg-void-dark border border-void-green/50 text-void-green px-4 py-2 rounded font-mono focus:outline-none focus:border-void-green"
                data-testid="handle-input"
              />
              <button
                type="submit"
                className="w-full bg-void-green/20 border border-void-green text-void-green py-2 rounded hover:bg-void-green/30 transition-colors"
                data-testid="start-game-btn"
              >
                Enter the Void
              </button>
            </form>
            <p className="text-void-green/50 text-xs mt-4">
              Lowercase letters, numbers, dashes, underscores only (max 16 chars)
            </p>
          </div>
        </div>
        <Link to="/" className="text-void-cyan hover:text-void-green text-sm mt-8">
          ← Back to ClawedCode
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-void-dark flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-void-green/30 flex justify-between items-center">
        <div>
          <h1 className="text-void-green text-glow text-xl">VOID MUD</h1>
          <p className="text-void-cyan text-sm">A text adventure in the liminal void</p>
        </div>
        <Link to="/" className="text-void-cyan hover:text-void-green text-sm">
          ← Exit to ClawedCode
        </Link>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left sidebar - HUD */}
        <aside className="w-full lg:w-72 p-4 border-b lg:border-b-0 lg:border-r border-void-green/30 space-y-4 overflow-y-auto">
          {/* Player Stats */}
          <div className="card">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-void-cyan text-sm">STATUS</h3>
              <button
                onClick={() => executeCommand('reset')}
                className="text-yellow-500/70 text-xs hover:text-yellow-400"
                data-testid="reset-btn"
              >
                reset
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-void-green/70">Handle</span>
                <span className="text-void-green font-mono">{playerName}</span>
              </div>
              <div className="border-t border-void-green/20 pt-2 flex justify-between">
                <span>HP</span>
                <span className={player.hp < 10 ? 'text-red-500' : 'text-void-green'}>
                  {player.hp}/{player.maxHp}
                </span>
              </div>
              <div className="w-full bg-void-dark border border-void-green/30 h-2 rounded">
                <div
                  className={`h-full rounded transition-all ${player.hp < 10 ? 'bg-red-500' : 'bg-void-green'}`}
                  style={{ width: `${(player.hp / player.maxHp) * 100}%` }}
                />
              </div>
              <div className="flex justify-between">
                <span>Energy</span>
                <span className="text-void-cyan">{player.energy}/14</span>
              </div>
              <div className="w-full bg-void-dark border border-void-cyan/30 h-2 rounded">
                <div
                  className="h-full bg-void-cyan rounded transition-all"
                  style={{ width: `${(player.energy / 14) * 100}%` }}
                />
              </div>
              <div className="flex justify-between">
                <span>Shield</span>
                <span className="text-yellow-400">{player.shield}/6</span>
              </div>
              <div className="flex justify-between">
                <span>Weapon</span>
                <span className="text-void-green">{player.weapon}</span>
              </div>
              {player.abilityCharge && (
                <div className="text-purple-400 text-xs">⚡ {player.abilityCharge} charged</div>
              )}
              {player.evading && (
                <div className="text-blue-400 text-xs">🛡️ evade ready</div>
              )}
            </div>
          </div>

          {/* Abilities */}
          <div className="card">
            <h3 className="text-void-cyan text-sm mb-2">ABILITIES</h3>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => executeCommand('surge')}
                disabled={player.energy < 3 || gameOver}
                className="btn py-1 px-2 text-xs disabled:opacity-40"
                title="+4 damage next attack"
                data-testid="ability-surge"
              >
                surge<br/><span className="text-void-cyan/60">3 EN</span>
              </button>
              <button
                onClick={() => executeCommand('evade')}
                disabled={player.energy < 4 || gameOver}
                className="btn py-1 px-2 text-xs disabled:opacity-40"
                title="Skip enemy counter-attack"
                data-testid="ability-evade"
              >
                evade<br/><span className="text-void-cyan/60">4 EN</span>
              </button>
              <button
                onClick={() => executeCommand('scan')}
                disabled={player.energy < 2 || gameOver}
                className="btn py-1 px-2 text-xs disabled:opacity-40"
                title="Reveal enemy stats"
                data-testid="ability-scan"
              >
                scan<br/><span className="text-void-cyan/60">2 EN</span>
              </button>
            </div>
          </div>

          {/* Inventory */}
          <div className="card">
            <h3 className="text-void-cyan text-sm mb-2">INVENTORY ({player.inventory.length})</h3>
            {player.inventory.length === 0 ? (
              <p className="text-void-green/50 text-sm">Empty</p>
            ) : (
              <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
                {inventoryItems.map((entry, i) => (
                  <button
                    key={i}
                    onClick={() => executeCommand(`use ${entry.item?.name}`)}
                    className="w-full text-left px-2 py-1 bg-void-dark/50 border border-void-green/20 rounded text-void-green hover:bg-void-green/10 cursor-pointer"
                    title={entry.item?.desc}
                    data-testid={`inv-${entry.id}`}
                  >
                    {entry.item?.icon} {entry.item?.name}
                    {entry.qty > 1 && <span className="text-void-cyan/60"> x{entry.qty}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Movement */}
          <div className="card">
            <h3 className="text-void-cyan text-sm mb-2">MOVE</h3>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <div></div>
              <button
                onClick={() => executeCommand('north')}
                className="btn py-1 px-2 text-xs"
                disabled={gameOver || !room?.exits?.north}
              >
                N
              </button>
              <div></div>
              <button
                onClick={() => executeCommand('west')}
                className="btn py-1 px-2 text-xs"
                disabled={gameOver || !room?.exits?.west}
              >
                W
              </button>
              <div className="flex items-center justify-center text-void-green/30">•</div>
              <button
                onClick={() => executeCommand('east')}
                className="btn py-1 px-2 text-xs"
                disabled={gameOver || !room?.exits?.east}
              >
                E
              </button>
              <div></div>
              <button
                onClick={() => executeCommand('south')}
                className="btn py-1 px-2 text-xs"
                disabled={gameOver || !room?.exits?.south}
              >
                S
              </button>
              <div></div>
            </div>
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => executeCommand('up')}
                className="btn py-1 px-2 text-xs flex-1"
                disabled={gameOver || !room?.exits?.up}
              >
                ↑ Up
              </button>
              <button
                onClick={() => executeCommand('down')}
                className="btn py-1 px-2 text-xs flex-1"
                disabled={gameOver || !room?.exits?.down}
              >
                ↓ Down
              </button>
            </div>
          </div>
        </aside>

        {/* Center - Terminal Output */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Room Display - fixed at top */}
          <div className="p-4 border-b border-void-green/30 flex-shrink-0">
            <RoomDisplay
              room={room}
              enemy={room?.enemy}
              player={player}
              onTakeItem={(name) => executeCommand(`take ${name}`)}
              onMove={(dir) => executeCommand(dir)}
              onRead={() => executeCommand('read')}
              onEnemyAction={(action) => executeCommand(action)}
            />
          </div>

          {/* Terminal Output - scrollable middle */}
          <div
            ref={scrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto p-4 font-mono text-sm space-y-1"
            data-testid="terminal-output"
          >
            {output.map((line, i) => (
              <div
                key={i}
                className={
                  line.type === 'error' ? 'text-red-500' :
                  line.type === 'system' ? 'text-void-cyan' :
                  line.type === 'input' ? 'text-yellow-400' :
                  'text-void-green'
                }
              >
                {line.text}
              </div>
            ))}
            {victory && (
              <div className="text-void-cyan mt-4 text-center text-lg">
                🌟 Congratulations! You escaped the void. 🌟
              </div>
            )}
            {confirmReset && (
              <div className="flex gap-2 items-center mt-2" data-testid="reset-confirm">
                <span className="text-yellow-400">Confirm reset?</span>
                <button
                  onClick={() => handleResetConfirm(true)}
                  className="btn-small bg-red-900/50 border-red-500/50 text-red-300 hover:bg-red-800/50"
                  data-testid="reset-yes"
                >
                  Yes, reset
                </button>
                <button
                  onClick={() => handleResetConfirm(false)}
                  className="btn-small"
                  data-testid="reset-no"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Input - fixed at bottom */}
          <form
            onSubmit={handleSubmit}
            className="flex-shrink-0 border-t border-void-green/30 p-4 flex gap-2 bg-void-dark"
          >
            <span className="text-void-green">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent text-void-green outline-none font-mono"
              placeholder={gameOver ? 'type "restart" to play again...' : 'enter command...'}
              autoComplete="off"
              data-testid="mud-input"
            />
          </form>
        </main>

        {/* Right sidebar - Map */}
        <aside className="w-full lg:w-80 p-4 border-t lg:border-t-0 lg:border-l border-void-green/30 overflow-y-auto space-y-4">
          <AsciiMap
            world={world}
            player={player}
            discovered={discovered}
            mapUnlocked={mapUnlocked}
          />

          {/* Current Location */}
          <div className="card">
            <h3 className="text-void-cyan text-sm mb-2">LOCATION</h3>
            <p className="text-void-green">{room?.name || 'Unknown'}</p>
            <p className="text-void-cyan/60 text-xs">
              {room?.coords ? `Level ${room.coords.z === 1 ? 'Upper' : room.coords.z === -1 ? 'Sub' : 'Main'}` : ''}
            </p>
          </div>

          {/* Voidmates */}
          <div className="card">
            <h3 className="text-void-cyan text-sm mb-2">VOIDMATES</h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-void-green/70">Status</span>
                <span className={connectionStatus === 'connected' ? 'text-void-green' : 'text-yellow-400'}>
                  {connectionStatus}
                </span>
              </div>
              {linkCode && (
                <div className="flex justify-between items-center">
                  <span className="text-void-green/70">Link</span>
                  <button
                    onClick={() => navigator.clipboard?.writeText(`link ${linkCode}`)}
                    className="text-void-cyan hover:text-void-green font-mono text-xs truncate max-w-[140px]"
                    title={`Click to copy: link ${linkCode}`}
                  >
                    {linkCode} ⧉
                  </button>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-void-green/70">Connected</span>
                <span className="text-void-green">{peerCount}</span>
              </div>
              {peerCount > 0 && (
                <div className="mt-2 pt-2 border-t border-void-green/20 space-y-1">
                  {Object.entries(voidmates).map(([id, mate]) => (
                    <div key={id} className="flex justify-between text-void-green/80">
                      <span className="truncate max-w-[100px]">{mate.name}</span>
                      <span className="text-void-cyan/60 truncate max-w-[60px]">{world[mate.room]?.abbr || '???'}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-void-green/40 text-xs mt-2">say &lt;msg&gt; to chat</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Mud
