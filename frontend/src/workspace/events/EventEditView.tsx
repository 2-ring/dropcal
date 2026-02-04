/**
 * EventEditView Component
 *
 * Displays an event editor with staggered section animations.
 *
 * Animation Structure:
 * - Container uses `editViewVariants` to control stagger timing
 * - Each section wraps content with `motion.div` using `editSectionVariants`
 * - Sections animate in sequence with ripple effect (scale + opacity + y movement)
 *
 * Current Sections (in order):
 * 1. Title - Event title input
 * 2. Calendar - Calendar selection chips
 * 3. Time - Date/time, timezone, and repeat settings
 * 4. Location - Location input
 * 5. Description - Description textarea
 *
 * To Add New Sections:
 * Simply wrap new content with: <motion.div variants={editSectionVariants}>
 * Position it where you want it in the render order to control animation timing.
 */

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import Skeleton from 'react-loading-skeleton'
import { Clock as ClockIcon, MapPin as LocationIcon, TextAlignLeft as DescriptionIcon, Globe as GlobeIcon, ArrowsClockwise as RepeatIcon } from '@phosphor-icons/react'
import type { CalendarEvent } from './types'
import { editViewVariants, editSectionVariants } from './animations'
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
  onClose: _onClose,
  onSave: _onSave,
  getCalendarColor: _getCalendarColor,
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

  const formatDateForDisplay = (dateTime: string) => {
    const date = new Date(dateTime)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTimeForDisplay = (dateTime: string) => {
    const date = new Date(dateTime)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const handleCalendarSelect = (calendarId: string) => {
    handleChange('calendar', calendarId)
  }

  return (
    <div className="event-edit-overlay">
      <motion.div
        className="event-edit-container"
        variants={editViewVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Section 1: Title */}
        <motion.div variants={editSectionVariants} className="event-edit-header">
          <input
            type="text"
            className="event-edit-title-input"
            value={editedEvent.summary}
            onChange={(e) => handleChange('summary', e.target.value)}
            placeholder="Add title"
          />
        </motion.div>

        {/* Scrollable Body */}
        <div className="event-edit-body">
          {/* Section 2: Calendar Selection */}
          <motion.div variants={editSectionVariants} className="event-edit-calendar-section">
            <div className="calendar-chips" ref={calendarScrollRef}>
              {isLoadingCalendars ? (
                // Show skeleton loaders with reducing opacity
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="calendar-chip-skeleton"
                    style={{ opacity: 1 - index * 0.3 }}
                  >
                    <Skeleton width={100} height={32} borderRadius={20} />
                  </div>
                ))
              ) : (
                calendars.map((calendar) => (
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
                ))
              )}
            </div>
          </motion.div>

          {/* Section 3: Time (includes date, time, timezone, repeat) */}
          <motion.div variants={editSectionVariants}>
            {/* Date & Time Row */}
            <div className="event-edit-row">
              <ClockIcon size={20} weight="regular" className="row-icon" />
              <div className="row-content">
                <div className="time-row-group">
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
                  <div className="row-main">
                    <span className="date-text">{formatDateForDisplay(editedEvent.start.dateTime)}</span>
                    {!isAllDay && (
                      <span className="date-text">{formatTimeForDisplay(editedEvent.start.dateTime)}</span>
                    )}
                  </div>
                  <div className="row-main">
                    <span className="date-text">{formatDateForDisplay(editedEvent.end.dateTime)}</span>
                    {!isAllDay && (
                      <span className="date-text">{formatTimeForDisplay(editedEvent.end.dateTime)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Timezone Row */}
            <div className="event-edit-row no-border">
              <GlobeIcon size={20} weight="regular" className="row-icon" />
              <div className="row-content">
                <span className="date-text">Eastern Standard Time</span>
              </div>
            </div>

            {/* Repeat Row */}
            <div className="event-edit-row no-border">
              <RepeatIcon size={20} weight="regular" className="row-icon" />
              <div className="row-content">
                <span className="date-text">Does not repeat</span>
              </div>
            </div>
          </motion.div>

          {/* Section 4: Location */}
          <motion.div variants={editSectionVariants} className="event-edit-row">
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
          </motion.div>

          {/* Section 5: Description */}
          <motion.div variants={editSectionVariants} className="event-edit-row">
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
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
