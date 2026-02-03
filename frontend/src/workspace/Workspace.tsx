import { motion } from 'framer-motion'
import { InputWorkspace } from './input'
import { EventsWorkspace } from './events/EventsWorkspace'
import { GoogleCalendarAuth } from './shared/GoogleCalendarAuth'
import type { CalendarEvent } from '../types/calendarEvent'
import type { LoadingStateConfig } from '../types/loadingState'

type AppState = 'input' | 'loading' | 'review'

interface WorkspaceProps {
  // State
  appState: AppState

  // Input state props
  uploadedFile: File | null
  isProcessing: boolean
  loadingConfig?: LoadingStateConfig | LoadingStateConfig[]
  feedbackMessage?: string
  greetingImage?: string

  // Events state props
  calendarEvents: (CalendarEvent | null)[]
  expectedEventCount?: number

  // Handlers
  onFileUpload: (file: File) => void
  onAudioSubmit: (audioBlob: Blob) => void
  onTextSubmit: (text: string) => void
  onClearFile: () => void
  onClearFeedback?: () => void
  onConfirm?: () => void
  onAuthChange: (authenticated: boolean) => void
}

export function Workspace({
  appState,
  uploadedFile,
  isProcessing,
  loadingConfig,
  feedbackMessage,
  greetingImage,
  calendarEvents,
  expectedEventCount,
  onFileUpload,
  onAudioSubmit,
  onTextSubmit,
  onClearFile,
  onClearFeedback,
  onConfirm,
  onAuthChange,
}: WorkspaceProps) {
  return (
    <>
      {/* Show greeting only in input state */}
      {appState === 'input' && greetingImage && (
        <motion.div
          className="greeting-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <img
            src={greetingImage}
            alt="Greeting"
            className="greeting-image"
          />
        </motion.div>
      )}

      {/* Input State */}
      {appState === 'input' && (
        <InputWorkspace
          uploadedFile={uploadedFile}
          isProcessing={isProcessing}
          loadingConfig={loadingConfig}
          feedbackMessage={feedbackMessage}
          onFileUpload={onFileUpload}
          onAudioSubmit={onAudioSubmit}
          onTextSubmit={onTextSubmit}
          onClearFile={onClearFile}
          onClearFeedback={onClearFeedback}
        />
      )}

      {/* Events State (loading or review) */}
      {(appState === 'loading' || appState === 'review') && (
        <EventsWorkspace
          events={calendarEvents}
          isLoading={appState === 'loading'}
          loadingConfig={Array.isArray(loadingConfig) ? loadingConfig : loadingConfig ? [loadingConfig] : []}
          expectedEventCount={expectedEventCount}
          onConfirm={onConfirm}
        />
      )}

      {/* Google Calendar Auth - only show in input state */}
      {appState === 'input' && (
        <GoogleCalendarAuth onAuthChange={onAuthChange} />
      )}
    </>
  )
}
