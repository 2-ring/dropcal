import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  X as XIcon,
  ArrowFatUp as ArrowFatUpIcon,
  ClipboardText as ClipboardIcon
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { IconButton } from '../components/IconButton'

interface TextInputProps {
  onClose: () => void
  onSubmit: (text: string) => void
}

export function TextInput({ onClose, onSubmit }: TextInputProps) {
  const [text, setText] = useState('')

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text)
      setText('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      if (clipboardText) {
        setText(clipboardText)
      }
    } catch (err) {
      toast.error('Paste Failed', {
        description: 'Could not access clipboard. Please paste manually.',
        duration: 3000,
      })
    }
  }

  return (
    <div className="sound-input-container">
      {/* Paste Button - Outside dock */}
      <IconButton
        icon={ClipboardIcon}
        onClick={handlePaste}
        title="Paste from Clipboard"
        className="plus-button-external"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
      />

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
          onClick={onClose}
          title="Cancel"
        >
          <XIcon size={24} weight="bold" />
        </button>

        {/* Text Input */}
        <input
          type="text"
          className="text-input-field"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste or type event details here..."
          autoFocus
        />

        {/* Submit Button */}
        <button
          className="dock-button submit"
          onClick={handleSubmit}
          title="Submit Text"
          disabled={!text.trim()}
        >
          <ArrowFatUpIcon size={28} weight="bold" />
        </button>
      </motion.div>
    </div>
  )
}
