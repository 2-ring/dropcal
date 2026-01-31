import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Images as ImagesIcon,
  Files as FileIcon,
  Microphone as MicrophoneIcon,
  ChatsCircle as EnvelopeIcon,
  ArrowFatUp as ArrowFatUpIcon
} from '@phosphor-icons/react'
import './App.css'

// Import all greeting images dynamically
const greetingImages = import.meta.glob('./assets/greetings/*.{png,jpg,jpeg,svg}', { eager: true, as: 'url' })
const greetingImagePaths = Object.values(greetingImages) as string[]

function App() {
  const [currentGreetingIndex] = useState(() =>
    Math.floor(Math.random() * greetingImagePaths.length)
  )
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      setUploadedFile(files[0])
      // TODO: Send to backend
      console.log('File dropped:', files[0])
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setUploadedFile(files[0])
      // TODO: Send to backend
      console.log('File selected:', files[0])
    }
  }, [])

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
        >
          {uploadedFile ? (
            <div className="file-info">
              <p className="file-name">{uploadedFile.name}</p>
              <p className="file-size">
                {(uploadedFile.size / 1024).toFixed(2)} KB
              </p>
              <button
                className="clear-button"
                onClick={() => setUploadedFile(null)}
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="icon-row">
              <motion.div
                className="icon-circle small"
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut", delay: 0.6 }}
              >
                <ImagesIcon size={24} weight="regular" />
              </motion.div>
              <motion.div
                className="icon-circle small"
                initial={{ opacity: 0, x: 10, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut", delay: 0.7 }}
              >
                <FileIcon size={24} weight="regular" />
              </motion.div>
              <motion.div
                className="icon-circle center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut", delay: 0.5 }}
              >
                <ArrowFatUpIcon size={32} weight="bold" />
              </motion.div>
              <motion.div
                className="icon-circle small"
                initial={{ opacity: 0, x: -10, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut", delay: 0.7 }}
              >
                <MicrophoneIcon size={24} weight="regular" />
              </motion.div>
              <motion.div
                className="icon-circle small"
                initial={{ opacity: 0, x: -20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut", delay: 0.6 }}
              >
                <EnvelopeIcon size={24} weight="regular" />
              </motion.div>
            </div>
          )}
          <input
            type="file"
            className="file-input"
            onChange={handleFileSelect}
            accept="image/*,.txt,.pdf,.eml"
          />
        </motion.div>
      </div>
    </div>
  )
}

export default App
