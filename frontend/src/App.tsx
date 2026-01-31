import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
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
import './App.css'
import wordmarkImage from './assets/Wordmark.png'

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
    <motion.div
      className="sound-input-dock"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
    >
      {/* Plus Button */}
      <motion.button
        className="dock-button"
        onClick={onUploadFile}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="Upload Audio File"
      >
        <PlusIcon size={24} weight="bold" />
      </motion.button>

      {/* Close Button */}
      <motion.button
        className="dock-button close"
        onClick={handleClose}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="Cancel"
      >
        <XIcon size={24} weight="bold" />
      </motion.button>

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
      <motion.button
        className="dock-button submit"
        onClick={handleSubmit}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="Submit Recording"
      >
        <ArrowFatUpIcon size={28} weight="bold" />
      </motion.button>
    </motion.div>
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
    setIsProcessing(true)
    setError(null)
    setExtractedEvents([])

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
      } else {
        setError('No calendar events found in the input')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Processing error:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [])

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
              {!isDragging && (
                <motion.div
                  className="icon-circle small clickable"
                  initial={{ opacity: 0, x: 20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut", delay: 0.6 }}
                  onClick={handleImageClick}
                  title="Upload Image"
                >
                  <ImagesIcon size={24} weight="regular" />
                </motion.div>
              )}
              {!isDragging && (
                <motion.div
                  className="icon-circle small clickable"
                  initial={{ opacity: 0, x: 10, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut", delay: 0.7 }}
                  onClick={handleDocumentClick}
                  title="Upload Document"
                >
                  <FileIcon size={24} weight="regular" />
                </motion.div>
              )}
              <motion.div
                className="icon-circle center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut", delay: 0.5 }}
              >
                {isDragging ? (
                  <CloudArrowUpIcon size={40} weight="bold" />
                ) : (
                  <ArrowFatUpIcon size={32} weight="bold" />
                )}
              </motion.div>
              {!isDragging && (
                <motion.div
                  className="icon-circle small clickable"
                  initial={{ opacity: 0, x: -10, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut", delay: 0.7 }}
                  onClick={handleAudioClick}
                  title="Record Audio"
                >
                  <MicrophoneIcon size={24} weight="regular" />
                </motion.div>
              )}
              {!isDragging && (
                <motion.div
                  className="icon-circle small clickable"
                  initial={{ opacity: 0, x: -20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut", delay: 0.6 }}
                  onClick={handleEmailClick}
                  title="Upload Email"
                >
                  <EnvelopeIcon size={24} weight="regular" />
                </motion.div>
              )}
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

      <footer className="footer">
        <img src={wordmarkImage} alt="DropCal" className="wordmark" />
      </footer>
    </div>
  )
}

export default App
