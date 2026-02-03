import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Images as ImagesIcon,
  Files as FileIcon,
  Microphone as MicrophoneIcon,
  Pen as TextIcon,
  ArrowFatUp as ArrowFatUpIcon
} from '@phosphor-icons/react'
import { AudioInput } from './audio'
import { TextInput } from './text'
import { FeedbackPill } from './feedback-pill'
import { LoadingState } from '../components/LoadingState'
import type { LoadingStateConfig, LoadingPhase } from '../types/loadingState'

interface MainInputAreaProps {
  uploadedFile: File | null
  isProcessing: boolean
  loadingConfig?: LoadingStateConfig | LoadingPhase[]
  feedbackMessage?: string
  onFileUpload: (file: File) => void
  onAudioSubmit: (audioBlob: Blob) => void
  onTextSubmit: (text: string) => void
  onClearFile: () => void
  onClearFeedback?: () => void
}

export function MainInputArea({
  uploadedFile,
  isProcessing,
  loadingConfig,
  feedbackMessage,
  onFileUpload,
  onAudioSubmit,
  onTextSubmit,
  onClearFile,
  onClearFeedback
}: MainInputAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTextInput, setIsTextInput] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isProcessing) {
      setIsDragging(true)
    }
  }, [isProcessing])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isProcessing) {
      setIsDragging(false)
    }
  }, [isProcessing])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isProcessing) return

    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      onFileUpload(files[0])
    }
  }, [onFileUpload, isProcessing])

  const handleImageClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        onFileUpload(files[0])
      }
    }
    input.click()
  }, [onFileUpload])

  const handleDocumentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.pdf,.doc,.docx,.eml'
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files
      if (files && files.length > 0) {
        onFileUpload(files[0])
      }
    }
    input.click()
  }, [onFileUpload])

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
        onFileUpload(files[0])
        setIsRecording(false)
      }
    }
    input.click()
  }, [onFileUpload])

  const handleAudioSubmit = useCallback((audioBlob: Blob) => {
    onAudioSubmit(audioBlob)
    setIsRecording(false)
  }, [onAudioSubmit])

  const handleTextClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsTextInput(true)
  }, [])

  const handleTextSubmit = useCallback((text: string) => {
    onTextSubmit(text)
    setIsTextInput(false)
  }, [onTextSubmit])

  const handleDropAreaClick = useCallback((e: React.MouseEvent) => {
    if (isProcessing) return

    // Only trigger file picker if clicking on the drop area background, not on buttons
    const target = e.target as HTMLElement
    if (target.classList.contains('drop-area') || target.classList.contains('icon-row')) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*,.txt,.pdf,.eml,.mp3,.wav,.m4a'
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files
        if (files && files.length > 0) {
          onFileUpload(files[0])
        }
      }
      input.click()
    }
  }, [onFileUpload, isProcessing])

  return (
    <motion.div
      className={`relative w-full max-w-175 min-h-45 -mt-24 rounded-4xl bg-[rgba(17,112,197,0.05)] flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-[rgba(17,112,197,0.1)] ${isDragging ? 'bg-[rgba(17,112,197,0.2)] scale-[1.02]' : ''} ${isProcessing ? '' : ''}`}
      style={{
        backgroundImage: isDragging
          ? "url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='32' ry='32' stroke='%231170C5FF' stroke-width='9' stroke-dasharray='28 22' stroke-dashoffset='0' stroke-linecap='round'/%3e%3c/svg%3e\")"
          : "url(\"data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='32' ry='32' stroke='%231170C5FF' stroke-width='9' stroke-dasharray='28 22' stroke-dashoffset='0' stroke-linecap='round'/%3e%3c/svg%3e\")",
        pointerEvents: isProcessing ? 'none' : 'auto'
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      onDragEnter={!isProcessing ? handleDragEnter : undefined}
      onDragLeave={!isProcessing ? handleDragLeave : undefined}
      onDragOver={!isProcessing ? handleDragOver : undefined}
      onDrop={!isProcessing ? handleDrop : undefined}
      onClick={!isProcessing ? handleDropAreaClick : undefined}
    >
      {isRecording ? (
        <AudioInput
          onClose={() => setIsRecording(false)}
          onSubmit={handleAudioSubmit}
          onUploadFile={handleAudioFileUpload}
        />
      ) : isTextInput ? (
        <TextInput
          onClose={() => setIsTextInput(false)}
          onSubmit={handleTextSubmit}
        />
      ) : feedbackMessage ? (
        <FeedbackPill
          message={feedbackMessage}
          onClose={() => onClearFeedback?.()}
        />
      ) : isProcessing ? (
        <LoadingState
          config={loadingConfig || { message: 'Processing...' }}
          isLoading={isProcessing}
        />
      ) : uploadedFile ? (
        <div className="flex flex-col items-center gap-4 pointer-events-auto">
          <p className="text-xl font-medium text-[var(--primary-color)] m-0 break-all text-center">{uploadedFile.name}</p>
          <p className="text-sm text-[#666] m-0">
            {(uploadedFile.size / 1024).toFixed(2)} KB
          </p>
          <button
            className="px-8 py-3 text-base font-medium text-white bg-[var(--primary-color)] border-none rounded-lg cursor-pointer transition-all duration-200 hover:bg-[rgba(17,112,197,0.85)] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(17,112,197,0.3)] active:translate-y-0"
            onClick={onClearFile}
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-6 pointer-events-none">
          <AnimatePresence>
            {!isDragging && (
              <motion.div
                key="image-button"
                className="flex items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] text-[#5f6368] w-12 h-12 pointer-events-auto cursor-pointer transition-[transform,box-shadow,color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:shadow-[0_8px_20px_rgba(17,112,197,0.25)] hover:text-[var(--primary-color)] active:shadow-[0_4px_10px_rgba(17,112,197,0.2)]"
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
                className="flex items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] text-[#5f6368] w-12 h-12 pointer-events-auto cursor-pointer transition-[transform,box-shadow,color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:shadow-[0_8px_20px_rgba(17,112,197,0.25)] hover:text-[var(--primary-color)] active:shadow-[0_4px_10px_rgba(17,112,197,0.2)]"
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
            className="flex items-center justify-center rounded-full bg-[var(--primary-color)] shadow-[0_4px_12px_rgba(17,112,197,0.3)] text-white w-16 h-16"
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
                className="flex items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] text-[#5f6368] w-12 h-12 pointer-events-auto cursor-pointer transition-[transform,box-shadow,color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:shadow-[0_8px_20px_rgba(17,112,197,0.25)] hover:text-[var(--primary-color)] active:shadow-[0_4px_10px_rgba(17,112,197,0.2)]"
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
                key="text-button"
                className="flex items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] text-[#5f6368] w-12 h-12 pointer-events-auto cursor-pointer transition-[transform,box-shadow,color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:shadow-[0_8px_20px_rgba(17,112,197,0.25)] hover:text-[var(--primary-color)] active:shadow-[0_4px_10px_rgba(17,112,197,0.2)]"
                initial={{ opacity: 0, x: -20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.8 }}
                transition={{ duration: 0.2, ease: "easeOut", delay: 0.05 }}
                onClick={handleTextClick}
                title="Text Input"
              >
                <TextIcon size={24} weight="regular" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
