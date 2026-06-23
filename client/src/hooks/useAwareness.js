import { useState, useEffect } from 'react'

export function useAwareness(provider) {
  const [users, setUsers] = useState([])

  useEffect(() => {
    if (!provider || !provider.awareness) {
      setUsers([])
      return
    }

    const updateUsers = () => {
      const states = Array.from(provider.awareness.getStates().values())
      const onlineUsers = states
        .map(state => state.user)
        .filter(user => user && user.name)
      
      // Deduplicate by username if someone has multiple tabs open
      const uniqueUsers = Array.from(
        new Map(onlineUsers.map(user => [user.name, user])).values()
      )

      setUsers(uniqueUsers)
    }

    // Initial load
    updateUsers()

    // Listen for connection/disconnection/changes
    provider.awareness.on('change', updateUsers)

    return () => {
      provider.awareness.off('change', updateUsers)
    }
  }, [provider])

  return users
}
