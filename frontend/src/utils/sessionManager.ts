import type {
  Session,
  SessionInput,
  AgentOutput,
  InputType,
  InputMetadata,
  ProcessingProgress,
  SessionListItem,
} from '../types/session'
import type { IdentifiedEvent, CalendarEvent } from '../types/calendarEvent'
import type { ContextResult } from '../types/context'

// Generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Categorize file type from metadata
function categorizeFileType(metadata: InputMetadata): InputType {
  if (!metadata.fileType) return 'document'

  const fileType = metadata.fileType.toLowerCase()
  const fileName = metadata.fileName?.toLowerCase() || ''

  // Check if it's an image
  if (fileType.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/.test(fileName)) {
    return 'image'
  }

  // Check if it's audio
  if (fileType.startsWith('audio/') ||
      /\.(mp3|wav|m4a|ogg|webm)$/.test(fileName)) {
    return 'audio'
  }

  // Everything else is a document
  return 'document'
}

// Create a new session from user input
export function createSession(
  type: InputType | 'file', // Accept legacy 'file' type for backward compatibility
  content: string,
  metadata: InputMetadata
): Session {
  const sessionId = generateId()
  const inputId = generateId()
  const now = new Date()

  // Auto-detect file type if 'file' is passed (for backward compatibility)
  const actualType: InputType = (type as string) === 'file' ? categorizeFileType(metadata) : (type as InputType)

  const input: SessionInput = {
    id: inputId,
    type: actualType,
    content,
    metadata,
    timestamp: now,
  }

  return {
    id: sessionId,
    createdAt: now,
    updatedAt: now,
    inputs: [input],
    progress: {
      stage: 'processing_input',
    },
    agentOutputs: [],
    extractedEvents: [],
    calendarEvents: [],
    status: 'active',
    title: generateSessionTitle(content, actualType),
    eventCount: 0,
  }
}

// Generate a readable title from input
function generateSessionTitle(content: string, type: InputType): string {
  // For image and document files, use the file name
  if (type === 'image' || type === 'document') {
    return content // File name
  }

  // For text/audio, use first 50 chars
  const truncated = content.substring(0, 50).trim()
  return truncated.length < content.length ? `${truncated}...` : truncated
}

// Update session with agent output
export function addAgentOutput(
  session: Session,
  agentName: string,
  input: any,
  output: any,
  success: boolean,
  duration?: number,
  error?: string
): Session {
  const now = new Date()

  const agentOutput: AgentOutput = {
    id: generateId(),
    agentName,
    timestamp: now,
    duration,
    input,
    output,
    success,
    error,
  }

  return {
    ...session,
    updatedAt: now,
    agentOutputs: [...session.agentOutputs, agentOutput],
  }
}

// Update session with context understanding
export function setContext(
  session: Session,
  context: ContextResult
): Session {
  return {
    ...session,
    updatedAt: new Date(),
    context,
    title: context.title,
  }
}

// Update session progress
export function updateProgress(
  session: Session,
  progress: Partial<ProcessingProgress>
): Session {
  return {
    ...session,
    updatedAt: new Date(),
    progress: { ...session.progress, ...progress },
  }
}

// Update extracted events
export function setExtractedEvents(
  session: Session,
  events: IdentifiedEvent[]
): Session {
  const eventCount = events.length

  return {
    ...session,
    updatedAt: new Date(),
    extractedEvents: events,
    eventCount,
    title:
      events.length > 0
        ? events[0].description.substring(0, 50)
        : session.title,
  }
}

// Update formatted calendar events
export function setCalendarEvents(
  session: Session,
  events: CalendarEvent[]
): Session {
  return {
    ...session,
    updatedAt: new Date(),
    calendarEvents: events,
    eventCount: events.length,
  }
}

// Mark session as complete or error
export function completeSession(
  session: Session,
  status: 'completed' | 'cancelled' | 'error',
  errorMessage?: string
): Session {
  return {
    ...session,
    updatedAt: new Date(),
    status,
    errorMessage,
    progress: {
      ...session.progress,
      stage: status === 'completed' ? 'complete' : 'error',
    },
  }
}

// Convert session to list item for sidebar
export function toSessionListItem(session: Session): SessionListItem {
  // Determine primary input type (use first input)
  const primaryInputType = session.inputs.length > 0 ? session.inputs[0].type : 'text'

  return {
    id: session.id,
    title: session.title,
    timestamp: session.createdAt,
    eventCount: session.eventCount,
    status: session.status,
    inputType: primaryInputType,
  }
}

// LocalStorage key for session persistence
const STORAGE_KEY = 'dropcal_sessions'

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
type SessionCacheListener = () => void

class SessionCache {
  private sessions: Map<string, Session> = new Map()
  private maxSessions = 50 // Keep last 50 sessions
  private listeners: Set<SessionCacheListener> = new Set()

  constructor() {
    // Load sessions from localStorage on initialization
    this.loadFromStorage()
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
    this.sessions.set(session.id, session)
    this.pruneOldSessions()
    this.saveToStorage() // Persist to localStorage
    this.notify() // Notify subscribers of change
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
    this.sessions.delete(id)
    this.saveToStorage() // Persist to localStorage
    this.notify() // Notify subscribers of change
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
    this.sessions.clear()
    localStorage.removeItem(STORAGE_KEY) // Clear from localStorage
    this.notify() // Notify subscribers of change
  }
}

export const sessionCache = new SessionCache()
