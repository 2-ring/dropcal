import { useState, useCallback } from 'react'
import { Image, FilePdf, FileText, FileAudio, Envelope } from '@phosphor-icons/react'
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
        <div className="greeting-container">
          <img
            src={greetingImagePaths[currentGreetingIndex]}
            alt="Greeting"
            className="greeting-image"
          />
        </div>

        <div
          className={`drop-area ${isDragging ? 'dragging' : ''}`}
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
              <div className="icon-circle small">
                <Image size={24} weight="regular" />
              </div>
              <div className="icon-circle small">
                <FileText size={24} weight="regular" />
              </div>
              <div className="icon-circle center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 15V3M12 3L8 7M12 3L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L2.621 19.485C2.72915 19.9177 2.97882 20.3018 3.33033 20.5763C3.68184 20.8508 4.11501 20.9999 4.561 21H19.439C19.885 20.9999 20.3182 20.8508 20.6697 20.5763C21.0212 20.3018 21.2708 19.9177 21.379 19.485L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="icon-circle small">
                <FilePdf size={24} weight="regular" />
              </div>
              <div className="icon-circle small">
                <Envelope size={24} weight="regular" />
              </div>
            </div>
          )}
          <input
            type="file"
            className="file-input"
            onChange={handleFileSelect}
            accept="image/*,.txt,.pdf,.eml"
          />
        </div>
      </div>
    </div>
  )
}

export default App
