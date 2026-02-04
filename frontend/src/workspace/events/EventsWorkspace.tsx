import { useState, useEffect, useRef } from 'react'
import 'react-loading-skeleton/dist/skeleton.css'
import { toast } from 'sonner'
import type { CalendarEvent } from './types'
import type { LoadingStateConfig } from './types'
import { TopBar, BottomBar } from './Bar'
import { Event } from './Event'
import { DateHeader } from './DateHeader'
import { EventEditView } from './EventEditView'
import wordmarkImage from '../../assets/Wordmark.png'
import './EventsWorkspace.css'

interface GoogleCalendar {
  id: string
  summary: string
  backgroundColor: string
  foregroundColor?: string
  primary?: boolean
}

interface EventsWorkspaceProps {
  events: (CalendarEvent | null)[]
  onConfirm?: () => void
  isLoading?: boolean
  loadingConfig?: LoadingStateConfig[]
  expectedEventCount?: number
}

export function EventsWorkspace({ events, onConfirm, isLoading = false, loadingConfig = [], expectedEventCount }: EventsWorkspaceProps) {
  const [changeRequest, setChangeRequest] = useState('')
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null)
  const [editedEvents, setEditedEvents] = useState<(CalendarEvent | null)[]>(events)
  const [isProcessingEdit, setIsProcessingEdit] = useState(false)
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([])
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch calendar list on mount
  useEffect(() => {
    const fetchCalendars = async () => {
      setIsLoadingCalendars(true)
      try {
        const response = await fetch('http://localhost:5000/api/calendar/list-calendars')
        if (response.ok) {
          const data = await response.json()
          setCalendars(data.calendars || [])
        }
      } catch (error) {
        console.error('Failed to fetch calendars:', error)
      } finally {
        setIsLoadingCalendars(false)
      }
    }
    fetchCalendars()
  }, [])

  // Sync editedEvents with events prop
  useEffect(() => {
    setEditedEvents(events)
  }, [events])

  const handleEventClick = (eventIndex: number) => {
    setEditingEventIndex(eventIndex)
  }

  const handleEventSave = (updatedEvent: CalendarEvent) => {
    if (editingEventIndex === null) return

    setEditedEvents(prev => {
      const updated = [...prev]
      updated[editingEventIndex] = updatedEvent
      return updated
    })

    toast.success('Event updated', {
      description: 'Your changes have been saved',
      duration: 2000
    })
  }

  const handleCloseEdit = () => {
    setEditingEventIndex(null)
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

  const formatTimeRange = (startDateTime: string, endDateTime: string): string => {
    const startTime = formatTime(startDateTime)
    const endTime = formatTime(endDateTime)

    if (startTime === endTime) {
      return startTime
    }

    return `${startTime} - ${endTime}`
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

  // Group events by date
  const groupEventsByDate = (events: CalendarEvent[]): Map<string, CalendarEvent[]> => {
    const grouped = new Map<string, CalendarEvent[]>()

    events.forEach(event => {
      const date = new Date(event.start.dateTime)
      // Use date string as key (YYYY-MM-DD)
      const dateKey = date.toISOString().split('T')[0]

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, [])
      }
      grouped.get(dateKey)!.push(event)
    })

    // Sort events within each date by start time
    grouped.forEach((events, dateKey) => {
      events.sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime())
    })

    return grouped
  }

  return (
    <div className="event-confirmation">
      <TopBar
        wordmarkImage={wordmarkImage}
        eventCount={events.filter(e => e !== null).length}
        isLoading={isLoading}
        expectedEventCount={expectedEventCount}
        isLoadingCalendars={isLoadingCalendars}
      />

      <div className="event-confirmation-content">
        {/* Event Edit View - Replaces event list when editing */}
        {editingEventIndex !== null && editedEvents[editingEventIndex] ? (
          <EventEditView
            event={editedEvents[editingEventIndex]!}
            calendars={calendars}
            isLoadingCalendars={isLoadingCalendars}
            onClose={handleCloseEdit}
            onSave={handleEventSave}
            getCalendarColor={getCalendarColor}
          />
        ) : (
          <div className="event-confirmation-list">
            {isLoading ? (
              // Streaming state - show skeleton for null events, actual cards for completed events
              Array.from({ length: expectedEventCount || 3 }).map((_, index) => {
                const event = events[index]
                const editedEvent = event ? (editedEvents[index] || event) : null

                // Calculate opacity for skeleton fade effect (like session list)
                const count = expectedEventCount || 3
                const skeletonOpacity = 1 - (index / count) * 0.7

                return (
                  <Event
                    key={event ? `event-${index}` : `skeleton-${index}`}
                    event={editedEvent}
                    index={index}
                    isLoading={!event}
                    isLoadingCalendars={isLoadingCalendars}
                    skeletonOpacity={skeletonOpacity}
                    calendars={calendars}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    formatTimeRange={formatTimeRange}
                    getCalendarColor={getCalendarColor}
                    onClick={() => handleEventClick(index)}
                  />
                )
              })
            ) : (
              // Complete state - group events by date and show with date headers
              (() => {
                const filteredEvents = editedEvents.filter((event): event is CalendarEvent => event !== null)
                const groupedEvents = groupEventsByDate(filteredEvents)

                // Sort date keys chronologically
                const sortedDateKeys = Array.from(groupedEvents.keys()).sort()

                return sortedDateKeys.flatMap((dateKey, dateGroupIndex) => {
                  const eventsForDate = groupedEvents.get(dateKey)!
                  const dateObj = new Date(dateKey + 'T00:00:00')

                  // Return date header followed by events for that date
                  return [
                    <DateHeader key={`date-${dateKey}`} date={dateObj} />,
                    ...eventsForDate.map((event, eventIndex) => {
                      // Find the original index for proper editing state management
                      const originalIndex = filteredEvents.indexOf(event)
                      return (
                        <Event
                          key={`${dateKey}-${eventIndex}`}
                          event={event}
                          index={originalIndex}
                          isLoadingCalendars={isLoadingCalendars}
                          calendars={calendars}
                          formatDate={formatDate}
                          formatTime={formatTime}
                          formatTimeRange={formatTimeRange}
                          getCalendarColor={getCalendarColor}
                          onClick={() => handleEventClick(originalIndex)}
                        />
                      )
                    })
                  ]
                })
              })()
            )}
          </div>
        )}
      </div>

      <BottomBar
        isLoading={isLoading}
        loadingConfig={loadingConfig}
        isChatExpanded={isChatExpanded}
        changeRequest={changeRequest}
        isProcessingEdit={isProcessingEdit}
        onChatExpandToggle={() => setIsChatExpanded(!isChatExpanded)}
        onChangeRequestChange={setChangeRequest}
        onSendRequest={handleSendRequest}
        onKeyDown={handleKeyDown}
        onConfirm={onConfirm}
      />
    </div>
  )
}
