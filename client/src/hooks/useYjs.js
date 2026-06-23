import { useMemo, useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'

export function useYjs(roomId) {
  const ydoc = useMemo(() => new Y.Doc(), [])
  const ytext = useMemo(() => ydoc.getText('code'), [ydoc])
  const [synced, setSynced] = useState(false)

  useEffect(() => {
    if (!roomId) return

    // Setup y-websocket provider
    const wsProvider = new WebsocketProvider(
      'ws://localhost:1234',
      roomId,
      ydoc
    )

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
    }
  }, [roomId, ydoc])

  return { ydoc, ytext, synced }
}
