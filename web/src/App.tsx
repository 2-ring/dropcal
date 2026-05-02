import { useState, useCallback, useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import { validateFile } from './workspace/input/validation'
import { Workspace } from './workspace/Workspace'
import { Menu } from './menu/Menu'
import { Plans } from './payment/Plans'
import { Welcome } from './welcome/Welcome'
import { NotFound } from './NotFound'
import { Privacy } from './legal/Privacy'
import { Terms } from './legal/Terms'
import { useAuth } from './auth/AuthContext'
import { AuthPage } from './auth/AuthPage'
import { RequireAuth } from './auth/RequireAuth'
import { RootRedirect } from './RootRedirect'
import { AppleCalendarModal } from './auth/AppleCalendarModal'
import { isNativePlatform } from './utils/platform'
import { App as CapApp } from '@capacitor/app'
import {
  NotificationProvider,
  useNotifications,
  createValidationErrorNotification,
  createWarningNotification,
  createErrorNotification,
  getFriendlyErrorMessage
} from './workspace/input/notifications'
import type { CalendarEvent, LoadingStateConfig } from './workspace/events/types'
import { LOADING_MESSAGES } from './workspace/events/types'
import type { Session as BackendSession } from './api/types'
import {
  createTextSession,
  uploadFile as apiUploadFile,
  getUserSessions,
  getSession,
  pushEvents,
  getSessionEvents,
  streamSession,
} from './api/backend-client'
import { syncCalendar, getCalendars } from './api/sync'
import type { SyncCalendar } from './api/sync'
import './App.css'

type AppState = 'input' | 'loading' | 'review'

interface SessionListItem {
  id: string
  title: string
  icon?: string
  timestamp: Date
  inputType: 'text' | 'image' | 'audio' | 'document' | 'pdf' | 'email'
  status: 'processing' | 'completed'
  eventCount: number
  addedToCalendar: boolean
}


function AppContent() {
  const { user, calendarReady, showAppleCalendarSetup, dismissAppleCalendarSetup } = useAuth()
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId?: string }>()
  const { addNotification } = useNotifications()

  const [appState, setAppState] = useState<AppState>('input')
  const [isProcessing, setIsProcessing] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [expectedEventCount, setExpectedEventCount] = useState<number | null>(null)
  const [loadingConfig, setLoadingConfig] = useState<LoadingStateConfig>(LOADING_MESSAGES.READING_FILE)
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem('dropcal_sidebar') !== 'closed')
  const [feedbackMessage, setFeedbackMessage] = useState<string>('')

  const [currentSession, setCurrentSession] = useState<BackendSession | null>(null)
  const [sessionHistory, setSessionHistory] = useState<BackendSession[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)

  // Seed from localStorage so events render with correct colors/names immediately on refresh
  const [syncedCalendars, setSyncedCalendars] = useState<SyncCalendar[]>(() => {
    try {
      const cached = localStorage.getItem('dropcal_calendars')
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })

  const activeViewSessionRef = useRef<string | null>(null)
  // Tracks the session currently being streamed via SSE (prevents URL-based
  // useEffect from clearing events before they're persisted to the DB)
  const streamingSessionRef = useRef<string | null>(null)
  const appStateRef = useRef<AppState>(appState)
  appStateRef.current = appState
  const prevLoadedSessionIdRef = useRef<string | undefined>()

  // Handle deep links on native (e.g. dropcal://s/SESSION_ID)
  useEffect(() => {
    if (!isNativePlatform()) return

    const listener = CapApp.addListener('appUrlOpen', ({ url }) => {
      const sessionMatch = url.match(/dropcal:\/\/s\/([a-zA-Z0-9-]+)/)
      if (sessionMatch) {
        navigate(`/app/s/${sessionMatch[1]}`)
      }
    })

    return () => {
      listener.then(l => l.remove())
    }
  }, [navigate])

  // Derive the viewed session's status from sessionHistory so the effect below
  // re-runs when the auto-refresh detects a processing session has completed
  const viewedSessionStatus = sessionHistory.find(s => s.id === sessionId)?.status

  // Load session from URL on mount or when sessionId changes
  useEffect(() => {
    if (sessionId) {
      const sessionChanged = sessionId !== prevLoadedSessionIdRef.current

      if (streamingSessionRef.current === sessionId) return
      if (!sessionChanged && appStateRef.current === 'review') return

      activeViewSessionRef.current = sessionId
      prevLoadedSessionIdRef.current = sessionId
      setIsProcessing(true)
      setAppState('loading')
      setCalendarEvents([])
      setLoadingConfig(LOADING_MESSAGES.READING_FILE)

      getSession(sessionId)
        .then(async session => {
          setCurrentSession(session)

          if (session.status === 'processing' || session.status === 'pending') {
            setLoadingConfig(LOADING_MESSAGES.EXTRACTING_EVENTS)
            return
          }

          try {
            const events = await getSessionEvents(session.id)
            if (events.length > 0) {
              setCalendarEvents(events)
              setAppState('review')
            } else if (session.processed_events && session.processed_events.length > 0) {
              setCalendarEvents(session.processed_events as CalendarEvent[])
              setAppState('review')
            } else {
              setAppState('input')
            }
          } catch {
            if (session.processed_events && session.processed_events.length > 0) {
              setCalendarEvents(session.processed_events as CalendarEvent[])
              setAppState('review')
            } else {
              setAppState('input')
            }
          }
        })
        .catch(error => {
          console.error('Failed to load session:', error)
          addNotification(createErrorNotification('The session could not be found.'))
          navigate('/app')
          setAppState('input')
        })
        .finally(() => {
          setIsProcessing(false)
        })
    }
  }, [sessionId, navigate, viewedSessionStatus])

  // Use ref to avoid re-fetching when user object reference changes but ID is the same
  const lastLoadedUserId = useRef<string | null>(null)
  useEffect(() => {
    if (user && user.id !== lastLoadedUserId.current) {
      lastLoadedUserId.current = user.id
      setSessionHistory([])
      setIsLoadingSessions(true)
      getUserSessions()
        .then(setSessionHistory)
        .catch(console.error)
        .finally(() => setIsLoadingSessions(false))
    }
  }, [user])

  // Fetch calendar list from DB immediately when auth is ready (fast, no provider API calls).
  // Then sync with provider in the background, which may update the list.
  const lastSyncedUserId = useRef<string | null>(null)
  useEffect(() => {
    if (user && calendarReady && user.id !== lastSyncedUserId.current) {
      lastSyncedUserId.current = user.id
      setSyncedCalendars([])

      getCalendars()
        .then(calendars => {
          if (calendars.length > 0) {
            setSyncedCalendars(calendars)
            try { localStorage.setItem('dropcal_calendars', JSON.stringify(calendars)) } catch {}
          }
        })
        .catch(() => {})

      syncCalendar()
        .then(result => {
          if (result.skipped) {
            console.log(`Calendar sync skipped: ${result.reason}`)
          } else {
            console.log(
              `Calendar synced (${result.strategy}): ` +
              `+${result.events_added} ~${result.events_updated} -${result.events_deleted} ` +
              `(Total: ${result.total_events_in_db} events)`
            )
          }
          if (result.calendars && result.calendars.length > 0) {
            setSyncedCalendars(result.calendars)
            try { localStorage.setItem('dropcal_calendars', JSON.stringify(result.calendars)) } catch {}
          }
        })
        .catch(error => {
          console.error('Calendar sync failed:', error)
        })
    }
  }, [user, calendarReady])

  useEffect(() => {
    const hasProcessingSessions = sessionHistory.some(
      s => s.status === 'pending' || s.status === 'processing'
    )
    if (!hasProcessingSessions) return

    const interval = setInterval(() => {
      getUserSessions()
        .then(setSessionHistory)
        .catch(console.error)
    }, 3000)

    return () => clearInterval(interval)
  }, [sessionHistory])

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => {
      localStorage.setItem('dropcal_sidebar', prev ? 'closed' : 'open')
      return !prev
    })
  }, [])

  const processText = useCallback(async (text: string) => {
    if (isProcessing) {
      addNotification(createWarningNotification('Please wait for the current input to finish processing.'))
      return
    }

    setIsProcessing(true)
    setAppState('loading')
    setCalendarEvents([])
    setExpectedEventCount(null)
    setFeedbackMessage('')
    setLoadingConfig(LOADING_MESSAGES.PROCESSING_TEXT)

    try {
      const session = await createTextSession(text)
      setCurrentSession(session)
      activeViewSessionRef.current = session.id

      setSessionHistory(prev => [session, ...prev.filter(s => s.id !== session.id)])

      streamingSessionRef.current = session.id
      await new Promise<void>((resolve, reject) => {
        const cleanup = streamSession(session.id, {
          onEvents: (events) => {
            if (activeViewSessionRef.current !== session.id) return
            setCalendarEvents(events)
            if (events.length > 0) {
              setAppState('review')
              navigate(`/app/s/${session.id}`)
              setSessionHistory(prev => prev.map(s =>
                s.id === session.id ? { ...s, processed_events: events } : s
              ))
            }
          },
          onCount: (count) => {
            setExpectedEventCount(count)
            setSessionHistory(prev => prev.map(s =>
              s.id === session.id ? { ...s, extracted_events: new Array(count) } : s
            ))
          },
          onStage: (stage) => {
            const stageMessages: Record<string, LoadingStateConfig> = {
              extracting: LOADING_MESSAGES.EXTRACTING_EVENTS,
              resolving: LOADING_MESSAGES.EXTRACTING_FACTS,
              personalizing: LOADING_MESSAGES.FORMATTING_CALENDAR,
            }
            if (stageMessages[stage]) {
              setLoadingConfig(stageMessages[stage])
            }
          },
          onTitle: (title) => {
            setSessionHistory(prev => prev.map(s =>
              s.id === session.id ? { ...s, title } : s
            ))
          },
          onIcon: (icon) => {
            setSessionHistory(prev => prev.map(s =>
              s.id === session.id ? { ...s, icon } : s
            ))
          },
          onComplete: () => {
            getSession(session.id)
              .then(updated => {
                setCurrentSession(prev => prev?.id === session.id ? { ...prev, ...updated } : prev)
                setSessionHistory(prev => prev.map(s =>
                  s.id === session.id ? { ...s, ...updated, status: 'processed' } : s
                ))
              })
              .catch(() => {
                setSessionHistory(prev => prev.map(s =>
                  s.id === session.id ? { ...s, status: 'processed' } : s
                ))
              })
              .finally(() => {
                streamingSessionRef.current = null
                setExpectedEventCount(null)
                setTimeout(() => {
                  setIsProcessing(false)
                  resolve()
                }, 0)
              })
          },
          onError: (error) => {
            streamingSessionRef.current = null
            cleanup()
            reject(new Error(error))
          },
        })
      })

    } catch (error) {
      console.error('Text processing failed:', error)
      addNotification(createErrorNotification(getFriendlyErrorMessage(error)))
      setAppState('input')
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, navigate])

  const processFile = useCallback(async (file: File) => {
    if (isProcessing) {
      addNotification(createWarningNotification('Please wait for the current file to finish processing.'))
      return
    }

    const validation = validateFile(file)
    if (!validation.valid) {
      addNotification(createValidationErrorNotification(validation.error || 'Invalid file'))
      return
    }

    setIsProcessing(true)
    setAppState('loading')
    setCalendarEvents([])
    setExpectedEventCount(null)
    setFeedbackMessage('')
    setLoadingConfig(LOADING_MESSAGES.READING_FILE)

    try {
      const { session } = await apiUploadFile(file)
      setCurrentSession(session)
      activeViewSessionRef.current = session.id

      setSessionHistory(prev => [session, ...prev.filter(s => s.id !== session.id)])

      setLoadingConfig(LOADING_MESSAGES.PROCESSING_FILE)

      streamingSessionRef.current = session.id
      await new Promise<void>((resolve, reject) => {
        const cleanup = streamSession(session.id, {
          onEvents: (events) => {
            if (activeViewSessionRef.current !== session.id) return
            setCalendarEvents(events)
            if (events.length > 0) {
              setAppState('review')
              navigate(`/app/s/${session.id}`)
              setSessionHistory(prev => prev.map(s =>
                s.id === session.id ? { ...s, processed_events: events } : s
              ))
            }
          },
          onCount: (count) => {
            setExpectedEventCount(count)
            setSessionHistory(prev => prev.map(s =>
              s.id === session.id ? { ...s, extracted_events: new Array(count) } : s
            ))
          },
          onStage: (stage) => {
            const stageMessages: Record<string, LoadingStateConfig> = {
              extracting: LOADING_MESSAGES.EXTRACTING_EVENTS,
              resolving: LOADING_MESSAGES.EXTRACTING_FACTS,
              personalizing: LOADING_MESSAGES.FORMATTING_CALENDAR,
            }
            if (stageMessages[stage]) {
              setLoadingConfig(stageMessages[stage])
            }
          },
          onTitle: (title) => {
            setSessionHistory(prev => prev.map(s =>
              s.id === session.id ? { ...s, title } : s
            ))
          },
          onIcon: (icon) => {
            setSessionHistory(prev => prev.map(s =>
              s.id === session.id ? { ...s, icon } : s
            ))
          },
          onComplete: () => {
            getSession(session.id)
              .then(updated => {
                setCurrentSession(prev => prev?.id === session.id ? { ...prev, ...updated } : prev)
                setSessionHistory(prev => prev.map(s =>
                  s.id === session.id ? { ...s, ...updated, status: 'processed' } : s
                ))
              })
              .catch(() => {
                setSessionHistory(prev => prev.map(s =>
                  s.id === session.id ? { ...s, status: 'processed' } : s
                ))
              })
              .finally(() => {
                streamingSessionRef.current = null
                setExpectedEventCount(null)
                setTimeout(() => {
                  setIsProcessing(false)
                  resolve()
                }, 0)
              })
          },
          onError: (error) => {
            streamingSessionRef.current = null
            cleanup()
            reject(new Error(error))
          },
        })
      })

    } catch (error) {
      console.error('File processing failed:', error)
      addNotification(createErrorNotification(getFriendlyErrorMessage(error)))
      setAppState('input')
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, navigate])

  const handleFileUpload = useCallback((file: File) => {
    processFile(file)
  }, [processFile])

  const handleAudioSubmit = useCallback((audioBlob: Blob) => {
    const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })

    if (audioBlob.size < 1000) {
      addNotification(createErrorNotification('Please record for at least a few seconds.'))
      return
    }

    processFile(audioFile)
  }, [processFile])

  const handleTextSubmit = useCallback((text: string) => {
    processText(text)
  }, [processText])

  const handleClearFile = useCallback(() => {
    setCalendarEvents([])
    setAppState('input')
  }, [])

  const handleSessionClick = useCallback((sessionId: string) => {
    activeViewSessionRef.current = sessionId
    navigate(`/app/s/${sessionId}`)
    if (window.innerWidth <= 768) setSidebarOpen(false)
  }, [navigate])

  const handleNewSession = useCallback(() => {
    activeViewSessionRef.current = null
    setAppState('input')
    setCurrentSession(null)
    setCalendarEvents([])
    setIsProcessing(false)
    navigate('/app')
    if (window.innerWidth <= 768) setSidebarOpen(false)
  }, [navigate])

  const handleAddToCalendar = useCallback(async (editedEvents?: CalendarEvent[]) => {
    if (!currentSession) {
      throw new Error('No session available to add to calendar.')
    }

    const eventIds = (editedEvents || [])
      .map(e => e.id)
      .filter((id): id is string => !!id)

    if (eventIds.length === 0) {
      throw new Error('No events to add to calendar.')
    }

    const result = await pushEvents(eventIds, {
      sessionId: currentSession.id,
      events: editedEvents,
    })

    const updatedSession = await getSession(currentSession.id)
    setCurrentSession(updatedSession)
    setSessionHistory(prev => prev.map(s =>
      s.id === updatedSession.id ? { ...s, ...updatedSession } : s
    ))

    return result
  }, [currentSession])


  const handleEventsChanged = useCallback((events: CalendarEvent[]) => {
    setCalendarEvents(events)
  }, [])

  // Handle event deletion: update sessionHistory so sidebar reflects the change
  const handleEventDeleted = useCallback((eventId: string, sessionId?: string, remainingCount?: number) => {
    if (!sessionId) return

    // If no events remain, the backend deletes the session — remove it from history
    if (remainingCount === 0) {
      setSessionHistory(prev => prev.filter(s => s.id !== sessionId))
      setCalendarEvents([])
      setCurrentSession(null)
      setAppState('input')
      navigate('/app')
      return
    }

    setSessionHistory(prev => prev.map(s => {
      if (s.id !== sessionId) return s
      const updatedEventIds = (s.event_ids || []).filter((id: string) => id !== eventId)
      return { ...s, event_ids: updatedEventIds }
    }))
  }, [navigate])

  const menuSessions: SessionListItem[] = sessionHistory
    .filter(session => {
      if (!session.id || !session.created_at) return false
      if (session.status === 'error') return false
      if (session.status === 'pending' || session.status === 'processing') return true
      const eventCount = session.event_ids?.length || session.processed_events?.length || 0
      return eventCount > 0
    })
    .map(session => ({
      id: session.id,
      title: session.title || (session.status === 'processed' ? 'Untitled' : ''),
      icon: session.icon,
      timestamp: new Date(session.created_at),
      inputType: session.input_type || 'text',
      status: session.status === 'processed' ? 'completed' as const : 'processing' as const,
      eventCount: session.event_ids?.length || session.processed_events?.length || session.extracted_events?.length || 0,
      addedToCalendar: session.added_to_calendar ?? false,
    }))

  return (
    <div className="app">
      <AppleCalendarModal
        isOpen={showAppleCalendarSetup}
        onClose={dismissAppleCalendarSetup}
      />
      <Menu
        isOpen={sidebarOpen}
        onToggle={handleSidebarToggle}
        sessions={menuSessions}
        currentSessionId={currentSession?.id}
        onSessionClick={handleSessionClick}
        onNewSession={handleNewSession}
        isLoadingSessions={isLoadingSessions}
      />
      <div className={`content ${sidebarOpen ? 'with-sidebar' : ''} ${appState === 'loading' || appState === 'review' ? 'events-view' : ''}`}>
        <Workspace
          appState={appState}
          uploadedFile={null}
          isProcessing={isProcessing}
          loadingConfig={[loadingConfig]}
          feedbackMessage={feedbackMessage}
          calendarEvents={calendarEvents}
          calendars={syncedCalendars}
          expectedEventCount={expectedEventCount ?? calendarEvents.length}
          inputType={currentSession?.input_type}
          inputContent={currentSession?.input_content}
          onFileUpload={handleFileUpload}
          onAudioSubmit={handleAudioSubmit}
          onTextSubmit={handleTextSubmit}
          onClearFile={handleClearFile}
          onConfirm={handleAddToCalendar}
          onEventDeleted={handleEventDeleted}
          onEventsChanged={handleEventsChanged}
          onMenuToggle={handleSidebarToggle}
          onNewSession={handleNewSession}
          sessionId={currentSession?.id}

        />
      </div>
    </div>
  )
}

// Redirects legacy /s/:sessionId links (from old emails / extension) to /app/s/:sessionId
function LegacySessionRedirect() {
  const { sessionId } = useParams<{ sessionId: string }>()
  return <Navigate to={`/app/s/${sessionId}`} replace />
}

// Router wrapper component
function App() {
  const native = isNativePlatform()

  return (
    <NotificationProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/app" element={<RequireAuth><AppContent /></RequireAuth>} />
        <Route path="/app/s/:sessionId" element={<RequireAuth><AppContent /></RequireAuth>} />
        <Route path="/s/:sessionId" element={<LegacySessionRedirect />} />
        {/* Web-only routes — skip on native app */}
        {!native && <Route path="/welcome" element={<Welcome />} />}
        {!native && <Route path="/plans" element={<Plans />} />}
        {!native && <Route path="/privacy" element={<Privacy />} />}
        {!native && <Route path="/terms" element={<Terms />} />}
        <Route path="*" element={native ? <Navigate to="/app" replace /> : <NotFound />} />
      </Routes>
    </NotificationProvider>
  )
}

export default App
