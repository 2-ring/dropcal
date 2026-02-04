import { motion } from 'framer-motion'
import {
  X as XIcon,
  Info as InfoIcon
} from '@phosphor-icons/react'

interface FeedbackProps {
  message: string
  onClose: () => void
}

export function Feedback({ message, onClose }: FeedbackProps) {
  return (
    <motion.div
      className="feedback-pill-dock"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
    >
      {/* Info Icon */}
      <div className="feedback-icon">
        <InfoIcon size={24} weight="duotone" />
      </div>

      {/* Message */}
      <div className="feedback-message">
        {message}
      </div>

      {/* Close Button */}
      <button
        className="dock-button close"
        onClick={onClose}
        title="Dismiss"
      >
        <XIcon size={24} weight="duotone" />
      </button>
    </motion.div>
  )
}
