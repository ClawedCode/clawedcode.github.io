import { useState, useCallback, useEffect, useRef } from 'react'

// Load PeerJS from CDN like legacy does (npm package might have bundling issues)
const loadPeerJS = () => {
  if (window.Peer) return Promise.resolve(window.Peer)

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js'
    script.async = true
    script.onload = () => resolve(window.Peer)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

const STORAGE_KEY = 'voidMudLinks'

// Load saved peer links from localStorage
const loadSavedLinks = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved ? JSON.parse(saved) : []
}

// Save peer link to localStorage
const saveLink = (peerId) => {
  const links = loadSavedLinks()
  if (!links.includes(peerId)) {
    links.push(peerId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links.slice(-10))) // Keep last 10
  }
}

export const useMultiplayer = (playerName, currentRoom, onMessage) => {
  const [linkCode, setLinkCode] = useState(null)
  const [connected, setConnected] = useState(false)
  const [voidmates, setVoidmates] = useState({})
  const [connectionStatus, setConnectionStatus] = useState('disconnected')

  const peerRef = useRef(null)
  const connectionsRef = useRef(new Map())
  const playerNameRef = useRef(playerName)
  const currentRoomRef = useRef(currentRoom)

  // Keep refs updated
  useEffect(() => {
    playerNameRef.current = playerName
  }, [playerName])

  useEffect(() => {
    currentRoomRef.current = currentRoom
  }, [currentRoom])

  // Broadcast message to all connections
  const broadcast = useCallback((type, extra = {}) => {
    const payload = {
      type,
      name: playerNameRef.current,
      room: currentRoomRef.current,
      id: peerRef.current?.id,
      ts: Date.now(),
      ...extra
    }

    for (const conn of connectionsRef.current.values()) {
      if (conn.open) {
        conn.send(payload)
      }
    }
  }, [])

  // Handle incoming message
  const handleSignal = useCallback((peerId, data) => {
    if (!data || typeof data !== 'object') return
    if (data.id === peerRef.current?.id) return // Ignore self-echo

    const { type, name, room } = data

    if (type === 'hello' || type === 'presence') {
      setVoidmates(prev => ({
        ...prev,
        [peerId]: { name, room, lastSeen: Date.now() }
      }))

      if (type === 'hello') {
        // Send presence back
        const conn = connectionsRef.current.get(peerId)
        if (conn?.open) {
          conn.send({
            type: 'presence',
            name: playerNameRef.current,
            room: currentRoomRef.current,
            id: peerRef.current?.id,
            ts: Date.now()
          })
        }
      }
    }

    if (type === 'leave') {
      setVoidmates(prev => {
        const next = { ...prev }
        delete next[peerId]
        return next
      })
    }

    if (type === 'chat') {
      onMessage?.({ type: 'chat', from: name, message: data.message, room: data.room })
    }

    if (type === 'enemy-sync') {
      onMessage?.({ type: 'enemy-sync', room: data.room, enemy: data.enemy })
    }
  }, [onMessage])

  // Attach handlers to a connection
  const attachHandlers = useCallback((conn) => {
    const peerId = conn.peer

    conn.on('open', () => {
      connectionsRef.current.set(peerId, conn)
      // Send hello
      conn.send({
        type: 'hello',
        name: playerNameRef.current,
        room: currentRoomRef.current,
        id: peerRef.current?.id,
        ts: Date.now()
      })
      saveLink(peerId)
      setConnected(connectionsRef.current.size > 0)
    })

    conn.on('data', (data) => {
      handleSignal(peerId, data)
    })

    conn.on('close', () => {
      connectionsRef.current.delete(peerId)
      setVoidmates(prev => {
        const next = { ...prev }
        delete next[peerId]
        return next
      })
      setConnected(connectionsRef.current.size > 0)
    })

    conn.on('error', () => {
      connectionsRef.current.delete(peerId)
      setConnected(connectionsRef.current.size > 0)
    })
  }, [handleSignal])

  // Connect to a peer by ID
  const connectToPeer = useCallback((targetId) => {
    if (!peerRef.current) {
      return { success: false, error: 'Not connected to mesh' }
    }

    if (connectionsRef.current.has(targetId)) {
      return { success: false, error: 'Already connected to this voidmate' }
    }

    if (targetId === peerRef.current.id) {
      return { success: false, error: 'Cannot connect to yourself' }
    }

    const conn = peerRef.current.connect(targetId, {
      reliable: false,
      serialization: 'json',
      metadata: {
        playerName: playerNameRef.current,
        room: currentRoomRef.current
      }
    })

    attachHandlers(conn)
    return { success: true }
  }, [attachHandlers])

  // Initialize PeerJS connection
  const connect = useCallback(async () => {
    if (peerRef.current) return

    setConnectionStatus('connecting')

    // Load PeerJS from CDN (matches legacy behavior)
    const Peer = await loadPeerJS()
    if (!Peer) {
      console.error('[MUD mesh] Failed to load PeerJS')
      setConnectionStatus('disconnected')
      return
    }

    const peerId = `voidmud-${Math.random().toString(16).substring(2, 10)}`

    // Exact legacy config from terminal.js
    const peer = new Peer(peerId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun3.l.google.com:19302' }
        ],
        iceTransportPolicy: 'all'
      }
    })

    peerRef.current = peer

    peer.on('open', (id) => {
      console.log('[MUD mesh] Connected to signaling server, link code:', id)
      setLinkCode(id)
      setConnectionStatus('connected')

      // Auto-connect to saved links
      setTimeout(() => {
        const savedLinks = loadSavedLinks()
        for (const savedId of savedLinks) {
          if (savedId !== id && !connectionsRef.current.has(savedId)) {
            connectToPeer(savedId)
          }
        }
      }, 500)
    })

    peer.on('connection', (conn) => {
      attachHandlers(conn)
    })

    peer.on('error', (err) => {
      // Only log to console, don't spam terminal - STUN-only means flakiness is expected
      // Match legacy behavior: just log and let PeerJS handle reconnection internally
      console.warn('[MUD mesh]', err?.message || 'connection error', '- STUN-only means flakiness is expected')
    })

    peer.on('close', () => {
      setConnectionStatus('disconnected')
      setLinkCode(null)
    })

    peer.on('disconnected', () => {
      setConnectionStatus('reconnecting')
      // Try to reconnect
      setTimeout(() => {
        if (peerRef.current && !peerRef.current.destroyed) {
          peerRef.current.reconnect()
        }
      }, 1000)
    })
  }, [attachHandlers, connectToPeer])

  // Disconnect from mesh
  const disconnect = useCallback(() => {
    broadcast('leave')

    for (const conn of connectionsRef.current.values()) {
      conn.close()
    }
    connectionsRef.current.clear()

    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }

    setLinkCode(null)
    setConnected(false)
    setVoidmates({})
    setConnectionStatus('disconnected')
  }, [broadcast])

  // Send chat message
  const sendChat = useCallback((message) => {
    broadcast('chat', { message })
  }, [broadcast])

  // Broadcast location change
  const broadcastLocation = useCallback((room) => {
    currentRoomRef.current = room
    broadcast('presence')
  }, [broadcast])

  // Broadcast enemy state
  const broadcastEnemyState = useCallback((room, enemy) => {
    broadcast('enemy-sync', { room, enemy })
  }, [broadcast])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (peerRef.current) {
        broadcast('leave')
        peerRef.current.destroy()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    linkCode,
    connected,
    voidmates,
    connectionStatus,
    peerCount: Object.keys(voidmates).length,
    connect,
    disconnect,
    connectToPeer,
    sendChat,
    broadcastLocation,
    broadcastEnemyState
  }
}

export default useMultiplayer
