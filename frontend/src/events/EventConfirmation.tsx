import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Equals as EqualsIcon, PencilSimple as EditIcon, PaperPlaneRight as SendIcon, X as XIcon, CheckFat as CheckIcon, ChatCircleDots as ChatIcon, Calendar as CalendarIcon } from '@phosphor-icons/react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { toast } from 'sonner'
import type { CalendarEvent } from '../types/calendarEvent'
import type { LoadingStateConfig } from '../types/loadingState'
import wordmarkImage from '../assets/Wordmark.png'

interface GoogleCalendar {
  id: string
  summary: string
  backgroundColor: string
  foregroundColor?: string
  primary?: boolean
}

interface EventConfirmationProps {
  events: (CalendarEvent | null)[]
  onConfirm?: () => void
  isLoading?: boolean
  loadingConfig?: LoadingStateConfig[]
  expectedEventCount?: number
}

export function EventConfirmation({ events, onConfirm, isLoading = false, loadingConfig = [], expectedEventCount }: EventConfirmationProps) {
  const [changeRequest, setChangeRequest] = useState('')
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  const [editingField, setEditingField] = useState<{ eventIndex: number; field: 'summary' | 'date' | 'description' } | null>(null)
  const [editedEvents, setEditedEvents] = useState<(CalendarEvent | null)[]>(events)
  const [isProcessingEdit, setIsProcessingEdit] = useState(false)
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch calendar list on mount
  useEffect(() => {
    const fetchCalendars = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/calendar/list-calendars')
        if (response.ok) {
          const data = await response.json()
          setCalendars(data.calendars || [])
        }
      } catch (error) {
        console.error('Failed to fetch calendars:', error)
      }
    }
    fetchCalendars()
  }, [])

  // Sync editedEvents with events prop
  useEffect(() => {
    setEditedEvents(events)
  }, [events])

  // Focus input when editing starts and position cursor at end
  useEffect(() => {
    if (editingField && inputRef.current) {
      const input = inputRef.current
      input.focus()
      // Set cursor position to end
      const length = input.value.length
      input.setSelectionRange(length, length)
    }
  }, [editingField])

  const handleEditClick = (eventIndex: number, field: 'summary' | 'date' | 'description', e?: React.MouseEvent) => {
    // Don't start editing if clicking on an input that's already being edited
    if (e?.target instanceof HTMLInputElement) {
      return
    }
    setEditingField({ eventIndex, field })
  }

  const handleEditChange = (eventIndex: number, field: string, value: string) => {
    setEditedEvents(prev => {
      const updated = [...prev]
      const event = updated[eventIndex]
      if (event) {
        updated[eventIndex] = {
          ...event,
          [field]: value
        }
      }
      return updated
    })
  }

  const handleEditBlur = () => {
    setEditingField(null)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      setEditingField(null)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditingField(null)
    }
  }

  const handleSendRequest = async () => {
    if (changeRequest.trim() && !isProcessingEdit) {
      const instruction = changeRequest.trim()
      setChangeRequest('')
      setIsProcessingEdit(true)

      // Show loading toast
      const loadingToast = toast.loading('Processing changes...', {
        description: 'AI is analyzing your request'
      })

      try {
        // Send instruction to each event and let AI figure out which ones to modify
        const modifiedEvents = await Promise.all(
          editedEvents.map(async (event, index) => {
            if (!event) return null

            try {
              const response = await fetch('http://localhost:5000/api/edit-event', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  event: event,
                  instruction: instruction
                }),
              })

              if (!response.ok) {
                console.error(`Failed to edit event ${index}:`, await response.text())
                return event // Keep original if edit fails
              }

              const result = await response.json()
              return result.modified_event
            } catch (error) {
              console.error(`Error editing event ${index}:`, error)
              return event // Keep original on error
            }
          })
        )

        // Update state with modified events
        setEditedEvents(modifiedEvents)

        // Dismiss loading and show success
        toast.dismiss(loadingToast)
        toast.success('Changes applied!', {
          description: 'Events updated based on your request',
          duration: 3000
        })

        // Close chat after successful edit
        setIsChatExpanded(false)
      } catch (error) {
        // Dismiss loading and show error
        toast.dismiss(loadingToast)
        toast.error('Failed to apply changes', {
          description: error instanceof Error ? error.message : 'Unknown error',
          duration: 5000
        })
      } finally {
        setIsProcessingEdit(false)
      }
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

  const getCalendarColor = (calendarName: string | undefined): string => {
    if (!calendarName || calendarName === 'Primary' || calendarName === 'Default') {
      // Default color for primary calendar (Google Calendar blue)
      return '#1170C5'
    }

    // Find matching calendar by name (case-insensitive)
    const calendar = calendars.find(cal =>
      cal.summary.toLowerCase() === calendarName.toLowerCase()
    )

    return calendar?.backgroundColor || '#1170C5'
  }

  const getTextColor = (backgroundColor: string): string => {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)

    // Calculate brightness using the luminance formula
    const brightness = (r * 299 + g * 587 + b * 114) / 1000

    // Return black for light backgrounds, white for dark backgrounds
    return brightness > 155 ? '#000000' : '#FFFFFF'
  }

  return (
    <motion.div
      className="w-full max-w-[800px] mx-auto flex flex-col h-full relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Fixed Header */}
      <div className="flex items-center justify-between h-12 px-5 bg-white/98 backdrop-blur-[20px] text-[#333] text-sm font-medium tracking-[0.01em] fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-[800px] z-30 shadow-[0_2px_12px_rgba(0,0,0,0.08),0_4px_24px_rgba(0,0,0,0.06)] border border-black/10 rounded-[32px] transition-all duration-300 ease-[ease] overflow-hidden">
        <div className="flex items-center gap-2 flex-1">
          <span>Google Calendar</span>
        </div>
        <div className="flex items-center justify-center flex-1">
          <img src={wordmarkImage} alt="DropCal" className="h-14 w-auto object-contain transition-opacity duration-300 ease-[ease]" />
        </div>
        <div className="flex items-center justify-end flex-1 text-sm text-[#666]">
          {isLoading && expectedEventCount === undefined ? (
            <Skeleton width={80} height={20} />
          ) : (
            <span>{isLoading ? expectedEventCount : events.filter(e => e !== null).length} {(isLoading ? expectedEventCount : events.filter(e => e !== null).length) === 1 ? 'event' : 'events'}</span>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pt-16 pb-56 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col gap-4 px-4">
          {isLoading ? (
            // Streaming state - show skeleton for null events, actual cards for completed events
            Array.from({ length: expectedEventCount || 3 }).map((_, index) => {
              const event = events[index]

              if (event) {
                // Event is complete - show actual card
                const editedEvent = editedEvents[index] || event
                return (
                  <motion.div
                    key={`event-${index}`}
                    className="p-6 transition-all duration-200 ease-[ease] flex flex-col gap-2 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)] border border-black/[0.06] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <div className="flex items-start relative flex-1 min-w-0">
                      <div className="inline-flex items-center gap-2 py-1 px-2 -my-1 -mx-2 rounded-md transition-colors duration-200 ease-[ease] flex-1 min-w-0 cursor-pointer hover:bg-[rgba(124,143,255,0.06)] [&:hover_.edit-icon]:opacity-100 [&:hover_.edit-icon]:text-[#7C8FFF]" onClick={(e) => handleEditClick(index, 'summary', e)}>
                        {editingField?.eventIndex === index && editingField?.field === 'summary' ? (
                          <input
                            ref={inputRef}
                            type="text"
                            className="flex-1 border-none outline-none bg-transparent p-0 m-0 font-inherit caret-[#7C8FFF] min-w-0 text-lg font-semibold text-[#1a1a1a] leading-[1.4]"
                            value={editedEvent.summary}
                            onChange={(e) => handleEditChange(index, 'summary', e.target.value)}
                            onBlur={handleEditBlur}
                            onKeyDown={handleEditKeyDown}
                          />
                        ) : (
                          <div className="text-lg font-semibold text-[#1a1a1a] leading-[1.4] flex-1 min-w-0">
                            {editedEvent.summary}
                          </div>
                        )}
                        <EditIcon
                          size={16}
                          weight="regular"
                          className="edit-icon flex-shrink-0 text-[#999] cursor-pointer opacity-0 transition-[opacity,color] duration-200 ease-[ease] mt-0.5 hover:opacity-100 hover:text-[#7C8FFF]"
                        />
                      </div>
                    </div>
                    <div className="flex items-start relative flex-1 min-w-0">
                      <div className="inline-flex items-center gap-2 py-1 px-2 -my-1 -mx-2 rounded-md transition-colors duration-200 ease-[ease] flex-1 min-w-0 cursor-pointer hover:bg-[rgba(124,143,255,0.06)] [&:hover_.edit-icon]:opacity-100 [&:hover_.edit-icon]:text-[#7C8FFF]" onClick={(e) => handleEditClick(index, 'date', e)}>
                        {editingField?.eventIndex === index && editingField?.field === 'date' ? (
                          <input
                            ref={inputRef}
                            type="text"
                            className="flex-1 border-none outline-none bg-transparent p-0 m-0 font-inherit caret-[#7C8FFF] min-w-0 text-sm text-[#666] font-normal"
                            value={formatDate(editedEvent.start.dateTime, editedEvent.end.dateTime)}
                            onChange={(e) => handleEditChange(index, 'date', e.target.value)}
                            onBlur={handleEditBlur}
                            onKeyDown={handleEditKeyDown}
                          />
                        ) : (
                          <div className="text-sm text-[#666] font-normal flex-1 min-w-0">
                            {formatDate(editedEvent.start.dateTime, editedEvent.end.dateTime)}
                          </div>
                        )}
                        <EditIcon
                          size={14}
                          weight="regular"
                          className="edit-icon flex-shrink-0 text-[#999] cursor-pointer opacity-0 transition-[opacity,color] duration-200 ease-[ease] mt-0.5 hover:opacity-100 hover:text-[#7C8FFF]"
                        />
                      </div>
                    </div>
                    <div className="flex items-start relative flex-1 min-w-0">
                      <div className="flex items-start gap-3 text-[0.9375rem] text-[#333] leading-[1.6] flex-1 min-w-0">
                        <EqualsIcon size={16} weight="bold" className="flex-shrink-0 mt-0.5 text-[#999]" />
                        <div className="inline-flex items-center gap-2 py-1 px-2 -my-1 -ml-2 rounded-md transition-colors duration-200 ease-[ease] flex-1 min-w-0 cursor-pointer hover:bg-[rgba(124,143,255,0.06)] [&:hover_.edit-icon]:opacity-100 [&:hover_.edit-icon]:text-[#7C8FFF]" onClick={(e) => handleEditClick(index, 'description', e)}>
                          {editingField?.eventIndex === index && editingField?.field === 'description' ? (
                            <input
                              ref={inputRef}
                              type="text"
                              className="flex-1 border-none outline-none bg-transparent p-0 m-0 font-inherit caret-[#7C8FFF] min-w-0 text-[0.9375rem] text-[#333] leading-[1.6]"
                              value={buildDescription(editedEvent)}
                              onChange={(e) => handleEditChange(index, 'description', e.target.value)}
                              onBlur={handleEditBlur}
                              onKeyDown={handleEditKeyDown}
                            />
                          ) : (
                            <span className="flex-1 min-w-0">{buildDescription(editedEvent)}</span>
                          )}
                          <EditIcon
                            size={14}
                            weight="regular"
                            className="edit-icon flex-shrink-0 text-[#999] cursor-pointer opacity-0 transition-[opacity,color] duration-200 ease-[ease] mt-0.5 hover:opacity-100 hover:text-[#7C8FFF]"
                          />
                        </div>
                      </div>
                    </div>
                    {editedEvent.calendar && (
                      <div className="flex items-start relative flex-1 min-w-0">
                        <div
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[0.8125rem] font-medium shadow-[0_2px_4px_rgba(0,0,0,0.1)] mt-1"
                          style={{
                            backgroundColor: getCalendarColor(editedEvent.calendar),
                            color: getTextColor(getCalendarColor(editedEvent.calendar))
                          }}
                        >
                          <CalendarIcon size={14} weight="fill" className="flex-shrink-0" />
                          <span>{editedEvent.calendar}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              } else {
                // Event not yet complete - show skeleton
                return (
                  <motion.div
                    key={`skeleton-${index}`}
                    className="p-6 transition-all duration-200 ease-[ease] flex flex-col gap-2 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)] border border-black/[0.06] pointer-events-none hover:shadow-[0_2px_8px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)] hover:transform-none"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Skeleton height={28} borderRadius={8} style={{ marginBottom: '12px' }} />
                    <Skeleton height={20} width="60%" borderRadius={8} style={{ marginBottom: '12px' }} />
                    <Skeleton count={2} height={18} borderRadius={8} />
                  </motion.div>
                )
              }
            })
          ) : (
            // Complete state - show only actual events (filter out nulls)
            editedEvents.filter((event): event is CalendarEvent => event !== null).map((event, index) => (
              <motion.div
                key={index}
                className="p-6 transition-all duration-200 ease-[ease] flex flex-col gap-2 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)] border border-black/6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="flex items-start relative flex-1 min-w-0">
                  <div className="inline-flex items-center gap-2 py-1 px-2 -my-1 -mx-2 rounded-md transition-colors duration-200 ease-[ease] flex-1 min-w-0 cursor-pointer hover:bg-[rgba(124,143,255,0.06)] [&:hover_.edit-icon]:opacity-100 [&:hover_.edit-icon]:text-[#7C8FFF]" onClick={(e) => handleEditClick(index, 'summary', e)}>
                    {editingField?.eventIndex === index && editingField?.field === 'summary' ? (
                      <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 border-none outline-none bg-transparent p-0 m-0 font-inherit caret-[#7C8FFF] min-w-0 text-lg font-semibold text-[#1a1a1a] leading-[1.4]"
                        value={event.summary}
                        onChange={(e) => handleEditChange(index, 'summary', e.target.value)}
                        onBlur={handleEditBlur}
                        onKeyDown={handleEditKeyDown}
                      />
                    ) : (
                      <div className="text-lg font-semibold text-[#1a1a1a] leading-[1.4] flex-1 min-w-0">
                        {event.summary}
                      </div>
                    )}
                    <EditIcon
                      size={16}
                      weight="regular"
                      className="edit-icon shrink-0 text-[#999] cursor-pointer opacity-0 transition-[opacity,color] duration-200 ease-[ease] mt-0.5 hover:opacity-100 hover:text-[#7C8FFF]"
                    />
                  </div>
                </div>
                <div className="flex items-start relative flex-1 min-w-0">
                  <div className="inline-flex items-center gap-2 py-1 px-2 -my-1 -mx-2 rounded-md transition-colors duration-200 ease-[ease] flex-1 min-w-0 cursor-pointer hover:bg-[rgba(124,143,255,0.06)] [&:hover_.edit-icon]:opacity-100 [&:hover_.edit-icon]:text-[#7C8FFF]" onClick={(e) => handleEditClick(index, 'date', e)}>
                    {editingField?.eventIndex === index && editingField?.field === 'date' ? (
                      <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 border-none outline-none bg-transparent p-0 m-0 font-inherit caret-[#7C8FFF] min-w-0 text-sm text-[#666] font-normal"
                        value={formatDate(event.start.dateTime, event.end.dateTime)}
                        onChange={(e) => handleEditChange(index, 'date', e.target.value)}
                        onBlur={handleEditBlur}
                        onKeyDown={handleEditKeyDown}
                      />
                    ) : (
                      <div className="text-sm text-[#666] font-normal flex-1 min-w-0">
                        {formatDate(event.start.dateTime, event.end.dateTime)}
                      </div>
                    )}
                    <EditIcon
                      size={14}
                      weight="regular"
                      className="edit-icon shrink-0 text-[#999] cursor-pointer opacity-0 transition-[opacity,color] duration-200 ease-[ease] mt-0.5 hover:opacity-100 hover:text-[#7C8FFF]"
                    />
                  </div>
                </div>
                <div className="flex items-start relative flex-1 min-w-0">
                  <div className="flex items-start gap-3 text-[0.9375rem] text-[#333] leading-[1.6] flex-1 min-w-0">
                    <EqualsIcon size={16} weight="bold" className="shrink-0 mt-0.5 text-[#999]" />
                    <div className="inline-flex items-center gap-2 py-1 px-2 -my-1 -ml-2 rounded-md transition-colors duration-200 ease-[ease] flex-1 min-w-0 cursor-pointer hover:bg-[rgba(124,143,255,0.06)] [&:hover_.edit-icon]:opacity-100 [&:hover_.edit-icon]:text-[#7C8FFF]" onClick={(e) => handleEditClick(index, 'description', e)}>
                      {editingField?.eventIndex === index && editingField?.field === 'description' ? (
                        <input
                          ref={inputRef}
                          type="text"
                          className="flex-1 border-none outline-none bg-transparent p-0 m-0 font-inherit caret-[#7C8FFF] min-w-0 text-[0.9375rem] text-[#333] leading-[1.6]"
                          value={buildDescription(event)}
                          onChange={(e) => handleEditChange(index, 'description', e.target.value)}
                          onBlur={handleEditBlur}
                          onKeyDown={handleEditKeyDown}
                        />
                      ) : (
                        <span className="flex-1 min-w-0">{buildDescription(event)}</span>
                      )}
                      <EditIcon
                        size={14}
                        weight="regular"
                        className="edit-icon shrink-0 text-[#999] cursor-pointer opacity-0 transition-[opacity,color] duration-200 ease-[ease] mt-0.5 hover:opacity-100 hover:text-[#7C8FFF]"
                      />
                    </div>
                  </div>
                </div>
                {event.calendar && (
                  <div className="flex items-start relative flex-1 min-w-0">
                    <div
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[0.8125rem] font-medium shadow-[0_2px_4px_rgba(0,0,0,0.1)] mt-1"
                      style={{
                        backgroundColor: getCalendarColor(event.calendar),
                        color: getTextColor(getCalendarColor(event.calendar))
                      }}
                    >
                      <CalendarIcon size={14} weight="fill" className="shrink-0" />
                      <span>{event.calendar}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Fixed Footer with gradient overlay */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] z-25 pointer-events-none transition-[left] duration-300 ease-[ease] before:content-[''] before:absolute before:bottom-0 before:left-0 before:right-0 before:h-[250px] before:bg-gradient-to-b before:from-white/0 before:via-white/50 before:to-white before:pointer-events-none">
        <div className="relative px-4 pb-8 pointer-events-auto">
          {isLoading ? (
            /* Progress indicators during loading */
            <div className="flex flex-col gap-3 w-full px-2">
              <div className="flex flex-col gap-2">
                {loadingConfig.map((config, index) => {
                  const IconComponent = config.icon
                  return (
                    <motion.div
                      key={index}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3 px-4 bg-white/98 backdrop-blur-[20px] rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)] border border-black/6"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      {IconComponent && (
                        <div className="flex items-center justify-center w-9 h-9 bg-[#7C8FFF] rounded-full shrink-0 text-white animate-[pulse_2s_ease-in-out_infinite]">
                          <IconComponent size={20} weight="bold" />
                        </div>
                      )}
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="text-[0.9375rem] font-medium text-[#1a1a1a] italic">{config.message}</div>
                        {config.submessage && (
                          <div className="text-[0.8125rem] text-[#666]">{config.submessage}</div>
                        )}
                      </div>
                      {config.count && (
                        <div className="text-sm font-semibold text-[#7C8FFF] whitespace-nowrap">{config.count}</div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Single row with cancel, chat input, and confirm buttons */
            <div className="flex items-center gap-3 overflow-hidden">
              <AnimatePresence mode="wait">
                {isChatExpanded ? (
                  <motion.div
                    key="chat-expanded"
                    className="flex items-center gap-3 flex-1"
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
                      className="flex items-center justify-center w-12 h-12 p-0 border-none rounded-full cursor-pointer transition-all duration-200 ease-[ease] shrink-0 bg-white/90 text-[#666] border border-black/10 hover:bg-[#f5f5f5] hover:text-[#333] hover:border-black/15 hover:-translate-y-px active:translate-y-0"
                      onClick={() => setIsChatExpanded(false)}
                      title="Close"
                    >
                      <XIcon size={20} weight="bold" />
                    </button>

                    <div className="flex items-center gap-2 flex-1 h-12 px-3 pr-3 pl-5 bg-white/98 backdrop-blur-[20px] rounded-[32px] shadow-[0_2px_12px_rgba(0,0,0,0.08),0_4px_24px_rgba(0,0,0,0.06)] border border-black/10">
                      <input
                        type="text"
                        className="flex-1 py-3 px-2 text-base font-inherit text-[#333] bg-transparent border-none outline-none transition-all duration-200 ease-[ease] placeholder:text-[#aaa] focus:outline-none"
                        placeholder="Request changes..."
                        value={changeRequest}
                        onChange={(e) => setChangeRequest(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                      />
                      <button
                        className="flex items-center justify-center w-9 h-9 p-0 bg-[#1170C5] border-none rounded-full cursor-pointer transition-all duration-200 ease-[ease] shrink-0 hover:bg-[#0D5A9E] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(17,112,197,0.3)] active:translate-y-0 disabled:bg-[#ddd] disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleSendRequest}
                        disabled={!changeRequest.trim() || isProcessingEdit}
                      >
                        <SendIcon size={20} weight="fill" className="text-white" />
                      </button>
                    </div>

                    {onConfirm && (
                      <button
                        className="flex items-center justify-center w-12 h-12 p-0 border-none rounded-full cursor-pointer transition-all duration-200 ease-[ease] shrink-0 bg-[#1170C5] text-white shadow-[0_2px_8px_rgba(17,112,197,0.25)] hover:bg-[#0e5a9d] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(17,112,197,0.3)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(17,112,197,0.25)]"
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
                    className="flex items-center gap-3 flex-1"
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
                      className="flex items-center justify-center gap-2 h-12 px-5 flex-1 bg-white/98 backdrop-blur-[20px] rounded-[32px] shadow-[0_2px_12px_rgba(0,0,0,0.08),0_4px_24px_rgba(0,0,0,0.06)] border border-black/10 text-[#666] text-[0.9375rem] font-medium font-inherit cursor-pointer transition-all duration-200 ease-[ease] hover:bg-[#f5f5f5] hover:text-[#333] hover:border-black/15 hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(0,0,0,0.1),0_6px_28px_rgba(0,0,0,0.08)] active:translate-y-0"
                      onClick={() => setIsChatExpanded(true)}
                    >
                      <ChatIcon size={18} weight="bold" />
                      <span>Request changes</span>
                    </button>

                    {onConfirm && (
                      <button
                        className="flex items-center justify-center w-12 h-12 p-0 border-none rounded-full cursor-pointer transition-all duration-200 ease-[ease] shrink-0 bg-[#1170C5] text-white shadow-[0_2px_8px_rgba(17,112,197,0.25)] hover:bg-[#0e5a9d] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(17,112,197,0.3)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(17,112,197,0.25)]"
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
