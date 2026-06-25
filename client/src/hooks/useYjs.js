import { useMemo, useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import { getUser, getToken } from '../services/api'

export function useYjs(roomId, role) {
  const ydoc = useMemo(() => new Y.Doc(), [])
  const ytext = useMemo(() => ydoc.getText('code'), [ydoc])
  const [synced, setSynced] = useState(false)
  const [status, setStatus] = useState('connecting')
  const [provider, setProvider] = useState(null)

  const ymeta = useMemo(() => ydoc.getMap('metadata'), [ydoc])

  useEffect(() => {
    if (!roomId) return

    // Setup y-websocket provider
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:1234'
    const token = getToken()
    const queryParams = token ? `?token=${token}` : ''
    
    const wsProvider = new WebsocketProvider(
      wsUrl,
      roomId + queryParams,
      ydoc
    )

    setProvider(wsProvider)

    // Set local awareness state
    const updateAwareness = () => {
      const user = getUser()
      wsProvider.awareness.setLocalStateField('user', {
        name: user ? user.username : 'Anonymous',
        color: user ? (user.color || '#7c6aef') : '#9ca3af',
        role: role || 'none'
      })
    }
    updateAwareness()

    // Setup offline persistence
    const idbProvider = new IndexeddbPersistence(roomId, ydoc)

    wsProvider.on('sync', (isSynced) => {
      if (isSynced) {
        setSynced(true)
      }
    })

    wsProvider.on('status', event => {
      setStatus(event.status) // 'connecting', 'connected', 'disconnected'
    })

    return () => {
      wsProvider.destroy()
      idbProvider.destroy()
      setProvider(null)
    }
  }, [roomId, ydoc])

  useEffect(() => {
    if (provider && provider.awareness) {
      const user = getUser()
      provider.awareness.setLocalStateField('user', {
        name: user ? user.username : 'Anonymous',
        color: user ? (user.color || '#7c6aef') : '#9ca3af',
        role: role || 'none'
      })
    }
  }, [provider, role])

  return { ydoc, ytext, ymeta, synced, provider, status }
}
