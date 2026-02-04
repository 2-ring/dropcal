import { useState, useRef } from 'react'
import { X as CloseIcon, Clock as ClockIcon, MapPin as LocationIcon, TextAlignLeft as DescriptionIcon, Globe as GlobeIcon, ArrowsClockwise as RepeatIcon } from '@phosphor-icons/react'
import type { CalendarEvent } from './types'
import './EventEditView.css'

interface GoogleCalendar {
  id: string
  summary: string
  backgroundColor: string
  foregroundColor?: string
  primary?: boolean
}

interface EventEditViewProps {
  event: CalendarEvent
  calendars: GoogleCalendar[]
  isLoadingCalendars?: boolean
  onClose: () => void
  onSave: (event: CalendarEvent) => void
  getCalendarColor: (calendarName: string | undefined) => string
}

export function EventEditView({
  event,
  calendars,
  isLoadingCalendars = false,
  onClose,
  onSave,
  getCalendarColor
}: EventEditViewProps) {
  const [editedEvent, setEditedEvent] = useState<CalendarEvent>(event)
  const [isAllDay, setIsAllDay] = useState(false)
  const calendarScrollRef = useRef<HTMLDivElement>(null)

  const handleChange = (field: keyof CalendarEvent, value: any) => {
    setEditedEvent(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = () => {
    onSave(editedEvent)
    onClose()
  }

  const calendarColor = getCalendarColor(editedEvent.calendar)

  const formatDateForDisplay = (dateTime: string) => {
    const date = new Date(dateTime)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTimeForInput = (dateTime: string) => {
    const date = new Date(dateTime)
    return date.toTimeString().slice(0, 5)
  }

  const formatTimeForDisplay = (dateTime: string) => {
    const date = new Date(dateTime)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const updateDateTime = (field: 'start' | 'end', time: string) => {
    const currentDateTime = new Date(editedEvent[field].dateTime)
    const [hours, minutes] = time.split(':').map(Number)
    currentDateTime.setHours(hours, minutes, 0, 0)

    setEditedEvent(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        dateTime: currentDateTime.toISOString()
      }
    }))
  }

  const handleCalendarSelect = (calendarId: string) => {
    handleChange('calendar', calendarId)
  }

  return (
    <div className="event-edit-overlay">
      <div className="event-edit-container">
        {/* Header with Title */}
        <div className="event-edit-header">
          <button className="event-edit-close" onClick={onClose}>
            <CloseIcon size={24} weight="regular" />
          </button>
          <input
            type="text"
            className="event-edit-title-input"
            value={editedEvent.summary}
            onChange={(e) => handleChange('summary', e.target.value)}
            placeholder="Add title"
          />
          <button className="event-edit-save" onClick={handleSave}>
            Save
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="event-edit-body">
          {/* Calendar Selection - Horizontal scroll */}
          <div className="event-edit-calendar-section">
            <div className="calendar-chips" ref={calendarScrollRef}>
              {calendars.map((calendar) => (
                <button
                  key={calendar.id}
                  className={`calendar-chip ${calendar.id === editedEvent.calendar ? 'active' : ''}`}
                  onClick={() => handleCalendarSelect(calendar.id)}
                  style={{
                    backgroundColor: calendar.id === editedEvent.calendar ? calendar.backgroundColor : 'transparent',
                    color: calendar.id === editedEvent.calendar ? '#ffffff' : '#666',
                    borderColor: calendar.backgroundColor
                  }}
                >
                  <div
                    className="calendar-chip-dot"
                    style={{ backgroundColor: calendar.backgroundColor }}
                  />
                  <span>{calendar.summary}</span>
                </button>
              ))}
            </div>
          </div>

          {/* All Day Toggle Row */}
          <div className="event-edit-row">
            <ClockIcon size={20} weight="regular" className="row-icon" />
            <div className="row-content">
              <div className="row-main">
                <span className="date-text">All day</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Start Date & Time Row */}
          <div className="event-edit-row">
            <ClockIcon size={20} weight="regular" className="row-icon" />
            <div className="row-content">
              <div className="row-main">
                <span className="date-text">{formatDateForDisplay(editedEvent.start.dateTime)}</span>
                {!isAllDay && (
                  <input
                    type="time"
                    className="time-input"
                    value={formatTimeForInput(editedEvent.start.dateTime)}
                    onChange={(e) => updateDateTime('start', e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* End Date & Time Row */}
          <div className="event-edit-row">
            <ClockIcon size={20} weight="regular" className="row-icon" />
            <div className="row-content">
              <div className="row-main">
                <span className="date-text">{formatDateForDisplay(editedEvent.end.dateTime)}</span>
                {!isAllDay && (
                  <input
                    type="time"
                    className="time-input"
                    value={formatTimeForInput(editedEvent.end.dateTime)}
                    onChange={(e) => updateDateTime('end', e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Timezone Row */}
          <div className="event-edit-row">
            <GlobeIcon size={20} weight="regular" className="row-icon" />
            <div className="row-content">
              <span className="date-text">Eastern Standard Time</span>
            </div>
          </div>

          {/* Repeat Row */}
          <div className="event-edit-row">
            <RepeatIcon size={20} weight="regular" className="row-icon" />
            <div className="row-content">
              <span className="date-text">Does not repeat</span>
            </div>
          </div>

          {/* Location Row */}
          <div className="event-edit-row">
            <LocationIcon size={20} weight="regular" className="row-icon" />
            <div className="row-content">
              <input
                type="text"
                className="row-input"
                placeholder="Add location"
                value={editedEvent.location || ''}
                onChange={(e) => handleChange('location', e.target.value)}
              />
            </div>
          </div>

          {/* Description Row */}
          <div className="event-edit-row">
            <DescriptionIcon size={20} weight="regular" className="row-icon" />
            <div className="row-content">
              <textarea
                className="row-textarea"
                placeholder="Add description"
                value={editedEvent.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
