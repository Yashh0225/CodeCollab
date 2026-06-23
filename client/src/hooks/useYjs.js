import { useMemo, useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import { getUser } from '../services/api'

export function useYjs(roomId) {
  const ydoc = useMemo(() => new Y.Doc(), [])
  const ytext = useMemo(() => ydoc.getText('code'), [ydoc])
  const [synced, setSynced] = useState(false)
  const [provider, setProvider] = useState(null)

  useEffect(() => {
    if (!roomId) return

    // Setup y-websocket provider
    const wsProvider = new WebsocketProvider(
      'ws://localhost:1234',
      roomId,
      ydoc
    )

    // Set local awareness state
    const user = getUser()
    if (user) {
      wsProvider.awareness.setLocalStateField('user', {
        name: user.username,
        color: user.color || '#7c6aef',
      })
    } else {
      // Fallback for demo
      wsProvider.awareness.setLocalStateField('user', {
        name: 'Anonymous',
        color: '#9ca3af',
      })
    }

    setProvider(wsProvider)

    // Setup offline persistence
    const idbProvider = new IndexeddbPersistence(roomId, ydoc)

    wsProvider.on('sync', (isSynced) => {
      if (isSynced) {
        setSynced(true)
      }
    })

    return () => {
      wsProvider.destroy()
      idbProvider.destroy()
      setProvider(null)
    }
  }, [roomId, ydoc])

  return { ydoc, ytext, synced, provider }
}
