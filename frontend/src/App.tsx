import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Images as ImagesIcon,
  Files as FileIcon,
  Microphone as MicrophoneIcon,
  ChatsCircle as EnvelopeIcon,
  ArrowFatUp as ArrowFatUpIcon,
  Plus as PlusIcon,
  X as XIcon,
  CloudArrowUp as CloudArrowUpIcon
} from '@phosphor-icons/react'
import { useVoiceVisualizer, VoiceVisualizer } from 'react-voice-visualizer'
import { Toaster, toast } from 'sonner'
import { validateFile } from './utils/fileValidation'
import './App.css'

// Import all greeting images dynamically
const greetingImages = import.meta.glob('./assets/greetings/*.{png,jpg,jpeg,svg}', { eager: true, as: 'url' })
const greetingImagePaths = Object.values(greetingImages) as string[]

// Sound Input Dock Component
interface SoundInputDockProps {
  onClose: () => void
  onSubmit: (audioBlob: Blob) => void
  onUploadFile: () => void
}

function SoundInputDock({ onClose, onSubmit, onUploadFile }: SoundInputDockProps) {
  const recorderControls = useVoiceVisualizer()
  const { recordedBlob, stopRecording } = recorderControls

  // Auto-start recording when component mounts
  useEffect(() => {
    recorderControls.startRecording()
  }, [])

  // Handle recorded blob
  useEffect(() => {
    if (recordedBlob) {
      onSubmit(recordedBlob)
    }
  }, [recordedBlob, onSubmit])

  const handleSubmit = () => {
    stopRecording()
  }

  const handleClose = () => {
    stopRecording()
    onClose()
  }

  return (
    <div className="sound-input-container">
      {/* Plus Button - Outside dock */}
      <motion.button
        className="dock-button plus-button-external"
        onClick={onUploadFile}
        title="Upload Audio File"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
      >
        <PlusIcon size={24} weight="bold" />
      </motion.button>

      <motion.div
        className="sound-input-dock"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
      >
        {/* Close Button */}
        <button
          className="dock-button close"
          onClick={handleClose}
          title="Cancel"
        >
          <XIcon size={24} weight="bold" />
        </button>

        {/* Sound Wave Visualization */}
        <div className="sound-visualizer-wrapper">
          <VoiceVisualizer
            controls={recorderControls}
            height={40}
            width="100%"
            backgroundColor="transparent"
            mainBarColor="#1170C5"
            secondaryBarColor="#a0a0a0"
            barWidth={2}
            gap={2}
            rounded={8}
            isControlPanelShown={false}
            isDefaultUIShown={false}
            onlyRecording={true}
          />
        </div>

        {/* Submit Button */}
        <button
          className="dock-button submit"
          onClick={handleSubmit}
          title="Submit Recording"
        >
          <ArrowFatUpIcon size={28} weight="bold" />
        </button>
      </motion.div>
    </div>
  )
}

function App() {
  const [currentGreetingIndex] = useState(() =>
    Math.floor(Math.random() * greetingImagePaths.length)
  )
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedEvents, setExtractedEvents] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

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
    setError(null)
    setExtractedEvents([])

    // Show loading toast
    const loadingToast = toast.loading('Processing file...', {
      description: `Analyzing ${file.name}`,
    })

    try {
      // Step 1: Process the file (extract text or prepare for vision)
      const formData = new FormData()
      formData.append('file', file)

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
      toast.loading('Extracting events...', {
        id: loadingToast,
        description: 'Analyzing calendar information',
      })

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

      if (extractResult.had_event_info) {
        setExtractedEvents(extractResult.events)

        // Success toast
        toast.success('Events Found!', {
          id: loadingToast,
          description: `Found ${extractResult.num_events_found} event${extractResult.num_events_found !== 1 ? 's' : ''} in ${file.name}`,
          duration: 4000,
        })
      } else {
        setError('No calendar events found in the input')

        // Info toast (not an error, just no events found)
        toast.info('No Events Found', {
          id: loadingToast,
          description: 'The file doesn\'t appear to contain any calendar events.',
          duration: 4000,
        })
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

      setError(errorMessage)

      // Error toast with specific messaging
      toast.error(errorTitle, {
        id: loadingToast,
        description: errorMessage,
        duration: 6000,
      })

      console.error('Processing error:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      setUploadedFile(file)
      processFile(file)
    }
  }, [processFile])

  // Handlers for specific file types
  const handleImageClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        const file = files[0]
        setUploadedFile(file)
        processFile(file)
      }
    }
    input.click()
  }, [processFile])

  const handleDocumentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.pdf,.doc,.docx,.eml'
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        const file = files[0]
        setUploadedFile(file)
        processFile(file)
      }
    }
    input.click()
  }, [processFile])

  const handleAudioClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsRecording(true)
  }, [])

  const handleAudioFileUpload = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*,.mp3,.wav,.m4a'
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        const file = files[0]
        setUploadedFile(file)
        processFile(file)
        setIsRecording(false)
      }
    }
    input.click()
  }, [processFile])

  const handleAudioSubmit = useCallback((audioBlob: Blob) => {
    // Convert blob to file
    const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })

    // Check if recording is too short/empty
    if (audioBlob.size < 1000) { // Less than 1KB
      toast.error('Recording Too Short', {
        description: 'Please record for at least a few seconds.',
        duration: 4000,
      })
      setIsRecording(false)
      return
    }

    setUploadedFile(audioFile)
    processFile(audioFile)
    setIsRecording(false)
  }, [processFile])

  const handleEmailClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.eml,.msg,.txt'
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        const file = files[0]
        setUploadedFile(file)
        processFile(file)
      }
    }
    input.click()
  }, [processFile])

  const handleDropAreaClick = useCallback((e: React.MouseEvent) => {
    // Only trigger file picker if clicking on the drop area background, not on buttons
    const target = e.target as HTMLElement
    if (target.classList.contains('drop-area') || target.classList.contains('icon-row')) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*,.txt,.pdf,.eml,.mp3,.wav,.m4a'
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files
        if (files && files.length > 0) {
          const file = files[0]
          setUploadedFile(file)
          processFile(file)
        }
      }
      input.click()
    }
  }, [processFile])

  return (
    <div className="app">
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: 'Inter, system-ui, sans-serif',
          },
        }}
      />
      <div className="content">
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

        <motion.div
          className={`drop-area ${isDragging ? 'dragging' : ''}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleDropAreaClick}
        >
          {isRecording ? (
            <SoundInputDock
              onClose={() => setIsRecording(false)}
              onSubmit={handleAudioSubmit}
              onUploadFile={handleAudioFileUpload}
            />
          ) : isProcessing ? (
            <div className="processing-indicator">
              <p>Processing {uploadedFile?.name}...</p>
            </div>
          ) : uploadedFile ? (
            <div className="file-info">
              <p className="file-name">{uploadedFile.name}</p>
              <p className="file-size">
                {(uploadedFile.size / 1024).toFixed(2)} KB
              </p>
              <button
                className="clear-button"
                onClick={() => {
                  setUploadedFile(null)
                  setExtractedEvents([])
                  setError(null)
                }}
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="icon-row">
              <AnimatePresence>
                {!isDragging && (
                  <motion.div
                    key="image-button"
                    className="icon-circle small clickable"
                    initial={{ opacity: 0, x: 20, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.8 }}
                    transition={{ duration: 0.2, ease: "easeOut", delay: 0.05 }}
                    onClick={handleImageClick}
                    title="Upload Image"
                  >
                    <ImagesIcon size={24} weight="regular" />
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {!isDragging && (
                  <motion.div
                    key="document-button"
                    className="icon-circle small clickable"
                    initial={{ opacity: 0, x: 10, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.8 }}
                    transition={{ duration: 0.2, ease: "easeOut", delay: 0.1 }}
                    onClick={handleDocumentClick}
                    title="Upload Document"
                  >
                    <FileIcon size={24} weight="regular" />
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.div
                className="icon-circle center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {isDragging ? (
                  <ArrowFatUpIcon size={32} weight="fill" />
                ) : (
                  <ArrowFatUpIcon size={32} weight="bold" />
                )}
              </motion.div>
              <AnimatePresence>
                {!isDragging && (
                  <motion.div
                    key="audio-button"
                    className="icon-circle small clickable"
                    initial={{ opacity: 0, x: -10, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -10, scale: 0.8 }}
                    transition={{ duration: 0.2, ease: "easeOut", delay: 0.1 }}
                    onClick={handleAudioClick}
                    title="Record Audio"
                  >
                    <MicrophoneIcon size={24} weight="regular" />
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {!isDragging && (
                  <motion.div
                    key="email-button"
                    className="icon-circle small clickable"
                    initial={{ opacity: 0, x: -20, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.8 }}
                    transition={{ duration: 0.2, ease: "easeOut", delay: 0.05 }}
                    onClick={handleEmailClick}
                    title="Upload Email"
                  >
                    <EnvelopeIcon size={24} weight="regular" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            className="error-message"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p>{error}</p>
          </motion.div>
        )}

        {/* Extracted Events Display */}
        {extractedEvents.length > 0 && (
          <motion.div
            className="events-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2>Found {extractedEvents.length} Event{extractedEvents.length !== 1 ? 's' : ''}</h2>
            {extractedEvents.map((event, index) => (
              <div key={index} className="event-card">
                <h3>{event.title}</h3>
                {event.raw_date && <p><strong>Date:</strong> {event.raw_date}</p>}
                {event.raw_time && <p><strong>Time:</strong> {event.raw_time}</p>}
                {event.raw_duration && <p><strong>Duration:</strong> {event.raw_duration}</p>}
                {event.location && <p><strong>Location:</strong> {event.location}</p>}
                {event.description && <p><strong>Details:</strong> {event.description}</p>}
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default App
