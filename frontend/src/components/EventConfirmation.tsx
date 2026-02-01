import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Equals as EqualsIcon, PencilSimple as EditIcon, PaperPlaneRight as SendIcon, X as XIcon, CheckFat as CheckIcon, ChatCircleDots as ChatIcon } from '@phosphor-icons/react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import type { CalendarEvent } from '../types/calendarEvent'
import type { LoadingStateConfig } from '../types/loadingState'
import wordmarkImage from '../assets/Wordmark.png'
import './EventConfirmation.css'

interface EventConfirmationProps {
  events: CalendarEvent[]
  onConfirm?: () => void
  isLoading?: boolean
  loadingConfig?: LoadingStateConfig[]
  expectedEventCount?: number
}

export function EventConfirmation({ events, onConfirm, isLoading = false, loadingConfig = [], expectedEventCount = 3 }: EventConfirmationProps) {
  const [changeRequest, setChangeRequest] = useState('')
  const [isChatExpanded, setIsChatExpanded] = useState(false)

  const handleSendRequest = () => {
    if (changeRequest.trim()) {
      // TODO: Implement change request functionality
      console.log('Change request:', changeRequest)
      setChangeRequest('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendRequest()
    }
  }

  const formatDate = (dateTime: string, endDateTime?: string): string => {
    const start = new Date(dateTime)
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }

    if (endDateTime) {
      const end = new Date(endDateTime)
      // Check if it's a multi-day event
      if (start.toDateString() !== end.toDateString()) {
        const startFormatted = start.toLocaleDateString('en-US', options)
        const endFormatted = end.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
        return `${startFormatted} – ${endFormatted}`
      }
    }

    return start.toLocaleDateString('en-US', options)
  }

  const formatTime = (dateTime: string): string => {
    const date = new Date(dateTime)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const buildDescription = (event: CalendarEvent): string => {
    const parts: string[] = []

    // Add time information
    const startTime = formatTime(event.start.dateTime)
    const endTime = formatTime(event.end.dateTime)

    if (startTime !== endTime) {
      parts.push(`${startTime} - ${endTime}`)
    } else {
      parts.push(startTime)
    }

    // Add location if available
    if (event.location) {
      parts.push(event.location)
    }

    // Add description if available
    if (event.description) {
      parts.push(event.description)
    }

    return parts.join('. ')
  }

  return (
    <motion.div
      className="event-confirmation"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Fixed Header */}
      <div className="event-confirmation-header">
        <div className="header-left">
          <span>Google Calendar</span>
        </div>
        <div className="header-center">
          <img src={wordmarkImage} alt="DropCal" className="header-wordmark" />
        </div>
        <div className="header-right">
          {isLoading ? (
            <Skeleton width={80} height={20} />
          ) : (
            <span>{events.length} {events.length === 1 ? 'event' : 'events'}</span>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="event-confirmation-content">
        <div className="event-confirmation-list">
          {isLoading ? (
            // Skeleton loading state - simple gray shimmer cards
            Array.from({ length: expectedEventCount }).map((_, index) => (
              <motion.div
                key={`skeleton-${index}`}
                className="event-confirmation-card skeleton-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Skeleton height={28} borderRadius={8} style={{ marginBottom: '12px' }} />
                <Skeleton height={20} width="60%" borderRadius={8} style={{ marginBottom: '12px' }} />
                <Skeleton count={2} height={18} borderRadius={8} />
              </motion.div>
            ))
          ) : (
            // Actual events
            events.map((event, index) => (
              <motion.div
                key={index}
                className="event-confirmation-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="event-confirmation-card-row">
                  <div className="event-confirmation-card-title">
                    {event.summary}
                  </div>
                  <EditIcon size={16} weight="regular" className="edit-icon" />
                </div>
                <div className="event-confirmation-card-row">
                  <div className="event-confirmation-card-date">
                    {formatDate(event.start.dateTime, event.end.dateTime)}
                  </div>
                  <EditIcon size={14} weight="regular" className="edit-icon" />
                </div>
                <div className="event-confirmation-card-row">
                  <div className="event-confirmation-card-description">
                    <EqualsIcon size={16} weight="bold" className="description-icon" />
                    <span>{buildDescription(event)}</span>
                  </div>
                  <EditIcon size={14} weight="regular" className="edit-icon" />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Fixed Footer with gradient overlay */}
      <div className="event-confirmation-footer-overlay">
        <div className="event-confirmation-footer">
          {isLoading ? (
            /* Progress indicators during loading */
            <div className="loading-progress-container">
              <div className="loading-progress-steps">
                {loadingConfig.map((config, index) => {
                  const IconComponent = config.icon
                  return (
                    <motion.div
                      key={index}
                      className="loading-progress-step"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      {IconComponent && (
                        <div className="loading-progress-icon">
                          <IconComponent size={20} weight="bold" />
                        </div>
                      )}
                      <div className="loading-progress-text">
                        <div className="loading-progress-message">{config.message}</div>
                        {config.submessage && (
                          <div className="loading-progress-submessage">{config.submessage}</div>
                        )}
                      </div>
                      {config.count && (
                        <div className="loading-progress-count">{config.count}</div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Single row with cancel, chat input, and confirm buttons */
            <div className="event-confirmation-footer-row">
              <AnimatePresence mode="wait">
                {isChatExpanded ? (
                  <motion.div
                    key="chat-expanded"
                    className="event-confirmation-footer-content"
                    initial={{
                      y: 20,
                      scale: 0.95,
                      opacity: 0
                    }}
                    animate={{
                      y: 0,
                      scale: 1,
                      opacity: 1
                    }}
                    exit={{
                      y: -20,
                      scale: 0.95,
                      opacity: 0
                    }}
                    transition={{
                      duration: 0.3,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                  >
                    <button
                      className="event-confirmation-icon-button cancel"
                      onClick={() => setIsChatExpanded(false)}
                      title="Close"
                    >
                      <XIcon size={20} weight="bold" />
                    </button>

                    <div className="event-confirmation-chat">
                      <input
                        type="text"
                        className="event-confirmation-chat-input"
                        placeholder="Request changes..."
                        value={changeRequest}
                        onChange={(e) => setChangeRequest(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                      />
                      <button
                        className="event-confirmation-chat-send"
                        onClick={handleSendRequest}
                        disabled={!changeRequest.trim()}
                      >
                        <SendIcon size={20} weight="fill" />
                      </button>
                    </div>

                    {onConfirm && (
                      <button
                        className="event-confirmation-icon-button confirm"
                        onClick={onConfirm}
                        title="Add to Calendar"
                      >
                        <CheckIcon size={24} weight="bold" />
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="chat-collapsed"
                    className="event-confirmation-footer-content"
                    initial={{
                      y: 20,
                      scale: 0.95,
                      opacity: 0
                    }}
                    animate={{
                      y: 0,
                      scale: 1,
                      opacity: 1
                    }}
                    exit={{
                      y: -20,
                      scale: 0.95,
                      opacity: 0
                    }}
                    transition={{
                      duration: 0.3,
                      ease: [0.22, 1, 0.36, 1]
                    }}
                  >
                    <button
                      className="event-confirmation-request-button"
                      onClick={() => setIsChatExpanded(true)}
                    >
                      <ChatIcon size={18} weight="bold" />
                      <span>Request changes</span>
                    </button>

                    {onConfirm && (
                      <button
                        className="event-confirmation-icon-button confirm"
                        onClick={onConfirm}
                        title="Add to Calendar"
                      >
                        <CheckIcon size={24} weight="bold" />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
