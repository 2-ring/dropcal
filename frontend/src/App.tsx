import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import { validateFile } from './utils/fileValidation'
import { MainInputArea } from './input/main-area'
import { GoogleCalendarAuth } from './components/GoogleCalendarAuth'
import { EventConfirmation } from './components/EventConfirmation'
import { Sidebar } from './components/Sidebar'
import type { CalendarEvent } from './types/calendarEvent'
import type { LoadingStateConfig } from './types/loadingState'
import { LOADING_MESSAGES } from './types/loadingState'
import './App.css'

// Import all greeting images dynamically
const greetingImages = import.meta.glob('./assets/greetings/*.{png,jpg,jpeg,svg}', { eager: true, as: 'url' })
const greetingImagePaths = Object.values(greetingImages) as string[]

// Import wordmark for review state
import wordmarkImage from './assets/Wordmark.png'

type AppState = 'input' | 'loading' | 'review'

function App() {
  const [currentGreetingIndex] = useState(() =>
    Math.floor(Math.random() * greetingImagePaths.length)
  )
  const [appState, setAppState] = useState<AppState>('input')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedEvents, setExtractedEvents] = useState<any[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [isCalendarAuthenticated, setIsCalendarAuthenticated] = useState(false)
  const [loadingConfig, setLoadingConfig] = useState<LoadingStateConfig[]>([{ message: 'Processing...' }])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const processFile = useCallback(async (file: File) => {
    // Prevent duplicate processing
    if (isProcessing) {
      toast.warning('Already Processing', {
        description: 'Please wait for the current file to finish processing.',
        duration: 3000,
      })
      return
    }

    // Validate file before processing
    const validation = validateFile(file)
    if (!validation.valid) {
      toast.error('Invalid File', {
        description: validation.error,
        duration: 5000,
      })
      return
    }

    setIsProcessing(true)
    setAppState('loading')
    setExtractedEvents([])
    setLoadingConfig([LOADING_MESSAGES.READING_FILE])

    try {
      // Step 1: Process the file (extract text or prepare for vision)
      const formData = new FormData()
      formData.append('file', file)

      setLoadingConfig([LOADING_MESSAGES.PROCESSING_FILE])
      const processResponse = await fetch('http://localhost:5000/api/process', {
        method: 'POST',
        body: formData,
      })

      if (!processResponse.ok) {
        const errorData = await processResponse.json()
        throw new Error(errorData.error || 'Failed to process file')
      }

      const processResult = await processResponse.json()

      // Step 2: Extract events from processed input
      setLoadingConfig([LOADING_MESSAGES.EXTRACTING_EVENTS])

      const extractResponse = await fetch('http://localhost:5000/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: processResult.text || '',
          metadata: processResult.metadata || {},
        }),
      })

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json()
        throw new Error(errorData.error || 'Failed to extract events')
      }

      const extractResult = await extractResponse.json()

      if (extractResult.has_events) {
        setExtractedEvents(extractResult.events)

        // Step 3: Process each event through fact extraction and calendar formatting
        const formattedEvents = []
        const totalEvents = extractResult.events.length

        for (let i = 0; i < extractResult.events.length; i++) {
          const event = extractResult.events[i]
          const eventNum = i + 1

          // Show progress for multi-event processing
          setLoadingConfig([LOADING_MESSAGES.PROCESSING_EVENTS(eventNum, totalEvents)])

          // Extract facts
          setLoadingConfig([{
            message: `Analyzing event (${eventNum}/${totalEvents})...`,
            icon: LOADING_MESSAGES.EXTRACTING_FACTS.icon
          }])

          const factsResponse = await fetch('http://localhost:5000/api/extract-facts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              raw_text: event.raw_text,
              description: event.description,
            }),
          })

          if (!factsResponse.ok) {
            throw new Error('Failed to extract facts')
          }

          const facts = await factsResponse.json()

          // Format for calendar
          setLoadingConfig([{
            message: `Formatting event (${eventNum}/${totalEvents})...`,
            icon: LOADING_MESSAGES.FORMATTING_CALENDAR.icon
          }])

          const calendarResponse = await fetch('http://localhost:5000/api/format-calendar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ facts }),
          })

          if (!calendarResponse.ok) {
            throw new Error('Failed to format calendar event')
          }

          const calendarEvent = await calendarResponse.json()
          formattedEvents.push(calendarEvent)
        }

        setCalendarEvents(formattedEvents)
        setAppState('review')

        // Success toast
        toast.success('Events Found!', {
          description: `Found ${extractResult.num_events} event${extractResult.num_events !== 1 ? 's' : ''} in ${file.name}`,
          duration: 4000,
        })
      } else {
        // Info toast (not an error, just no events found)
        toast.info('No Events Found', {
          description: 'The file doesn\'t appear to contain any calendar events.',
          duration: 4000,
        })
        setUploadedFile(null)
        setAppState('input')
      }
    } catch (err) {
      let errorMessage = 'An error occurred'
      let errorTitle = 'Processing Failed'

      // Handle different error types
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorTitle = 'Connection Error'
        errorMessage = 'Could not connect to the server. Make sure the backend is running on http://localhost:5000'
      } else if (err instanceof Error) {
        errorMessage = err.message
      }

      // Error toast with specific messaging
      toast.error(errorTitle, {
        description: errorMessage,
        duration: 6000,
      })

      console.error('Processing error:', err)
      setUploadedFile(null)
      setAppState('input')
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing])

  // Wrapper for file upload
  const handleFileUpload = useCallback((file: File) => {
    // Don't show the file in the input area, go straight to processing
    processFile(file)
  }, [processFile])

  // Wrapper for audio submission
  const handleAudioSubmit = useCallback((audioBlob: Blob) => {
    // Convert blob to file
    const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })

    // Check if recording is too short/empty
    if (audioBlob.size < 1000) { // Less than 1KB
      toast.error('Recording Too Short', {
        description: 'Please record for at least a few seconds.',
        duration: 4000,
      })
      return
    }

    // Don't show the file in the input area, go straight to processing
    processFile(audioFile)
  }, [processFile])

  const processText = useCallback(async (text: string) => {
    // Prevent duplicate processing
    if (isProcessing) {
      toast.warning('Already Processing', {
        description: 'Please wait for the current input to finish processing.',
        duration: 3000,
      })
      return
    }

    setIsProcessing(true)
    setAppState('loading')
    setExtractedEvents([])
    setLoadingConfig([LOADING_MESSAGES.PROCESSING_TEXT])

    try {
      // Extract events from text input
      setLoadingConfig([LOADING_MESSAGES.EXTRACTING_EVENTS])
      const extractResponse = await fetch('http://localhost:5000/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          metadata: {},
        }),
      })

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json()
        throw new Error(errorData.error || 'Failed to extract events')
      }

      const extractResult = await extractResponse.json()

      if (extractResult.has_events) {
        setExtractedEvents(extractResult.events)

        // Process each event through fact extraction and calendar formatting
        const formattedEvents = []
        const totalEvents = extractResult.events.length

        for (let i = 0; i < extractResult.events.length; i++) {
          const event = extractResult.events[i]
          const eventNum = i + 1

          // Show progress for multi-event processing
          setLoadingConfig([LOADING_MESSAGES.PROCESSING_EVENTS(eventNum, totalEvents)])

          // Extract facts
          setLoadingConfig([{
            message: `Analyzing event (${eventNum}/${totalEvents})...`,
            icon: LOADING_MESSAGES.EXTRACTING_FACTS.icon
          }])

          const factsResponse = await fetch('http://localhost:5000/api/extract-facts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              raw_text: event.raw_text,
              description: event.description,
            }),
          })

          if (!factsResponse.ok) {
            throw new Error('Failed to extract facts')
          }

          const facts = await factsResponse.json()

          // Format for calendar
          setLoadingConfig([{
            message: `Formatting event (${eventNum}/${totalEvents})...`,
            icon: LOADING_MESSAGES.FORMATTING_CALENDAR.icon
          }])

          const calendarResponse = await fetch('http://localhost:5000/api/format-calendar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ facts }),
          })

          if (!calendarResponse.ok) {
            throw new Error('Failed to format calendar event')
          }

          const calendarEvent = await calendarResponse.json()
          formattedEvents.push(calendarEvent)
        }

        setCalendarEvents(formattedEvents)
        setAppState('review')

        // Success toast
        toast.success('Events Found!', {
          description: `Found ${extractResult.num_events} event${extractResult.num_events !== 1 ? 's' : ''}`,
          duration: 4000,
        })
      } else {
        // Info toast (not an error, just no events found)
        toast.info('No Events Found', {
          description: 'The text doesn\'t appear to contain any calendar events.',
          duration: 4000,
        })
        setUploadedFile(null)
        setAppState('input')
      }
    } catch (err) {
      let errorMessage = 'An error occurred'
      let errorTitle = 'Processing Failed'

      // Handle different error types
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorTitle = 'Connection Error'
        errorMessage = 'Could not connect to the server. Make sure the backend is running on http://localhost:5000'
      } else if (err instanceof Error) {
        errorMessage = err.message
      }

      // Error toast with specific messaging
      toast.error(errorTitle, {
        description: errorMessage,
        duration: 6000,
      })

      console.error('Processing error:', err)
      setUploadedFile(null)
      setAppState('input')
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing])

  // Wrapper for text submission
  const handleTextSubmit = useCallback((text: string) => {
    processText(text)
  }, [processText])

  // Wrapper for clearing file
  const handleClearFile = useCallback(() => {
    setUploadedFile(null)
    setExtractedEvents([])
    setCalendarEvents([])
    setAppState('input')
  }, [])

  // Handler for canceling event review
  const handleCancelReview = useCallback(() => {
    setCalendarEvents([])
    setExtractedEvents([])
    setUploadedFile(null)
    setAppState('input')
  }, [])

  return (
    <div className="app">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <Toaster
        position="bottom-center"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        }}
      />
      <div className={`content ${sidebarOpen ? 'with-sidebar' : ''}`}>
        {/* Show greeting only in input and loading states */}
        {(appState === 'input' || appState === 'loading') && (
          <motion.div
            className="greeting-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <img
              src={greetingImagePaths[currentGreetingIndex]}
              alt="Greeting"
              className="greeting-image"
            />
          </motion.div>
        )}

        {/* Show wordmark in review state */}
        {appState === 'review' && (
          <motion.div
            className="greeting-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <img
              src={wordmarkImage}
              alt="DropCal"
              className="wordmark-image"
            />
          </motion.div>
        )}

        {/* Show MainInputArea only when in input or loading state */}
        {(appState === 'input' || appState === 'loading') && (
          <MainInputArea
            uploadedFile={uploadedFile}
            isProcessing={isProcessing}
            loadingConfig={loadingConfig}
            onFileUpload={handleFileUpload}
            onAudioSubmit={handleAudioSubmit}
            onTextSubmit={handleTextSubmit}
            onClearFile={handleClearFile}
          />
        )}

        {/* Show EventConfirmation only when in review state */}
        {appState === 'review' && calendarEvents.length > 0 && (
          <EventConfirmation
            events={calendarEvents}
            onConfirm={() => {
              // TODO: Implement add to calendar functionality
              toast.success('Adding to calendar...', {
                description: 'This feature will be implemented soon!',
                duration: 3000,
              })
            }}
            onCancel={handleCancelReview}
          />
        )}

        {/* Google Calendar Authentication - only show in input and loading states */}
        {(appState === 'input' || appState === 'loading') && (
          <GoogleCalendarAuth onAuthChange={setIsCalendarAuthenticated} />
        )}
      </div>
    </div>
  )
}

export default App
