import { useState, useEffect } from 'react'
import { sessionCache } from '../utils/sessionManager'
import type { Session } from '../types/session'

/**
 * Custom hook that automatically syncs with session cache changes
 * Uses observer pattern for efficient, real-time updates
 */
export function useSessionHistory(): Session[] {
  const [sessions, setSessions] = useState<Session[]>(() => sessionCache.getAll())

  useEffect(() => {
    // Subscribe to cache changes
    const unsubscribe = sessionCache.subscribe(() => {
      setSessions(sessionCache.getAll())
    })

    // Cleanup: unsubscribe on unmount
    return unsubscribe
  }, [])

  return sessions
}
