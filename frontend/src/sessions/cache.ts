import type { Session } from './types'
import {
  createSessionOnBackend,
  updateSessionOnBackend,
  deleteSessionFromBackend,
} from './backend'

// LocalStorage key for session persistence
const STORAGE_KEY = 'dropcal_sessions'

// Track which sessions exist on backend to avoid duplicate creates
const BACKEND_SESSION_IDS_KEY = 'dropcal_backend_session_ids'

// Serialize session for storage (handles Date objects)
function serializeSession(session: Session): any {
  return {
    ...session,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    inputs: session.inputs.map(input => ({
      ...input,
      timestamp: input.timestamp.toISOString(),
      metadata: {
        ...input.metadata,
        timestamp: input.metadata.timestamp.toISOString(),
      },
    })),
    agentOutputs: session.agentOutputs.map(output => ({
      ...output,
      timestamp: output.timestamp.toISOString(),
    })),
  }
}

// Deserialize session from storage (converts ISO strings back to Dates)
function deserializeSession(data: any): Session {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    inputs: data.inputs.map((input: any) => ({
      ...input,
      timestamp: new Date(input.timestamp),
      metadata: {
        ...input.metadata,
        timestamp: new Date(input.metadata.timestamp),
      },
    })),
    agentOutputs: data.agentOutputs.map((output: any) => ({
      ...output,
      timestamp: new Date(output.timestamp),
    })),
  }
}

// Session storage (in-memory cache with observer pattern + localStorage persistence)
export type SessionCacheListener = () => void

export class SessionCache {
  private sessions: Map<string, Session> = new Map()
  private maxSessions = 50 // Keep last 50 sessions
  private listeners: Set<SessionCacheListener> = new Set()
  private backendSessionIds: Set<string> = new Set() // Track sessions that exist on backend

  constructor() {
    // Only load from localStorage on construction (synchronous, no auth needed).
    // The backend fetch with temp-user-id is legacy dead code — the real session
    // list is fetched via getUserSessions() in App.tsx.
    this.loadFromStorage()

    // Load backend session IDs from localStorage
    try {
      const stored = localStorage.getItem(BACKEND_SESSION_IDS_KEY)
      if (stored) {
        const ids = JSON.parse(stored)
        this.backendSessionIds = new Set(ids)
      }
    } catch {
      // Ignore corrupted data
    }

  }

  // Load sessions from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const serializedSessions = JSON.parse(stored)
        serializedSessions.forEach((data: any) => {
          const session = deserializeSession(data)
          this.sessions.set(session.id, session)
        })
      }
    } catch (error) {
      console.error('Failed to load sessions from localStorage:', error)
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Save sessions to localStorage
  private saveToStorage(): void {
    try {
      const sessions = this.getAll()
      const serialized = sessions.map(serializeSession)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized))
    } catch (error) {
      console.error('Failed to save sessions to localStorage:', error)
      // Handle quota exceeded or other errors
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        // Clear old sessions and try again
        this.pruneOldSessions(true)
        try {
          const sessions = this.getAll()
          const serialized = sessions.map(serializeSession)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized))
        } catch {
          console.error('Still failed after pruning - localStorage may be full')
        }
      }
    }
  }

  // Save backend session IDs to localStorage
  private saveBackendSessionIds(): void {
    try {
      const ids = Array.from(this.backendSessionIds)
      localStorage.setItem(BACKEND_SESSION_IDS_KEY, JSON.stringify(ids))
    } catch (error) {
      console.error('Failed to save backend session IDs:', error)
    }
  }

  // Subscribe to cache changes
  subscribe(listener: SessionCacheListener): () => void {
    this.listeners.add(listener)
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Notify all subscribers of changes
  private notify(): void {
    this.listeners.forEach(listener => listener())
  }

  save(session: Session): void {
    // 1. Save to in-memory cache immediately (fast UI updates)
    this.sessions.set(session.id, session)
    this.pruneOldSessions()

    // 2. Save to localStorage as backup
    this.saveToStorage()

    // 3. Notify subscribers of change (UI updates immediately)
    this.notify()

    // 4. Sync with backend asynchronously (don't block UI)
    this.syncSessionToBackend(session)
  }

  // Sync a session to the backend (non-blocking)
  private async syncSessionToBackend(session: Session): Promise<void> {
    try {
      // Check if session already exists on backend
      const existsOnBackend = this.backendSessionIds.has(session.id)

      if (existsOnBackend) {
        // Update existing session
        await updateSessionOnBackend(session)
      } else {
        // Create new session
        await createSessionOnBackend(session)
        this.backendSessionIds.add(session.id)
        this.saveBackendSessionIds()
      }
    } catch (error) {
      console.error('Failed to sync session to backend:', error)
      // Don't throw - gracefully degrade to localStorage-only mode
    }
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id)
  }

  getAll(): Session[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    )
  }

  delete(id: string): void {
    // 1. Delete from in-memory cache immediately
    this.sessions.delete(id)

    // 2. Save to localStorage
    this.saveToStorage()

    // 3. Notify subscribers of change (UI updates immediately)
    this.notify()

    // 4. Delete from backend asynchronously (don't block UI)
    this.deleteSessionFromBackend(id)
  }

  // Delete a session from the backend (non-blocking)
  private async deleteSessionFromBackend(sessionId: string): Promise<void> {
    try {
      if (this.backendSessionIds.has(sessionId)) {
        await deleteSessionFromBackend(sessionId)
        this.backendSessionIds.delete(sessionId)
        this.saveBackendSessionIds()
      }
    } catch (error) {
      console.error('Failed to delete session from backend:', error)
      // Don't throw - gracefully degrade
    }
  }

  private pruneOldSessions(aggressive = false): void {
    const limit = aggressive ? Math.floor(this.maxSessions / 2) : this.maxSessions
    if (this.sessions.size > limit) {
      const sorted = this.getAll()
      const toDelete = sorted.slice(limit)
      toDelete.forEach((s) => this.sessions.delete(s.id))
      // No need to notify here since save() already does
    }
  }

  clear(): void {
    // Get session IDs before clearing
    const sessionIds = Array.from(this.sessions.keys())

    // 1. Clear in-memory cache immediately
    this.sessions.clear()

    // 2. Clear localStorage
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(BACKEND_SESSION_IDS_KEY)

    // 3. Notify subscribers of change (UI updates immediately)
    this.notify()

    // 4. Delete all sessions from backend asynchronously
    this.clearBackendSessions(sessionIds)
  }

  // Clear all sessions from backend (non-blocking)
  private async clearBackendSessions(sessionIds: string[]): Promise<void> {
    try {
      // Delete all sessions that exist on backend
      const deletePromises = sessionIds
        .filter(id => this.backendSessionIds.has(id))
        .map(id => deleteSessionFromBackend(id))

      await Promise.all(deletePromises)

      this.backendSessionIds.clear()
    } catch (error) {
      console.error('Failed to clear sessions from backend:', error)
      // Don't throw - gracefully degrade
    }
  }
}

export const sessionCache = new SessionCache()
