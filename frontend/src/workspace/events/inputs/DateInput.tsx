import { useState, useRef, useEffect, useMemo } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import './DateInput.css'

export interface DateInputProps {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  isEditing?: boolean
  placeholder?: string
  className?: string
}

const WEEKDAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function formatDisplay(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = []

  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d)
  }
  return days
}

export function DateInputDesktop({ value, onChange, onFocus, onBlur, isEditing, className }: DateInputProps) {
  const selectedDate = useMemo(() => new Date(value), [value])
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const displayValue = useMemo(() => formatDisplay(value), [value])

  // Reset view to selected date's month when opening
  useEffect(() => {
    if (isEditing) {
      setViewYear(selectedDate.getFullYear())
      setViewMonth(selectedDate.getMonth())
      setIsOpen(true)
    }
  }, [isEditing, selectedDate])

  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth])

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  const handleDayClick = (day: number) => {
    const base = new Date(value)
    const newDate = new Date(
      viewYear, viewMonth, day,
      base.getHours(), base.getMinutes(), base.getSeconds()
    )
    onChange(newDate.toISOString())
    setIsOpen(false)
    onBlur?.()
  }

  const handleContainerBlur = (e: React.FocusEvent) => {
    // Only close if focus moves outside the container
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setIsOpen(false)
      onBlur?.()
    }
  }

  if (!isEditing) {
    return <span className={className}>{displayValue}</span>
  }

  return (
    <div className="date-input-container" ref={containerRef} onBlur={handleContainerBlur}>
      <span
        className={`date-input-display ${className || ''}`}
        onClick={() => {
          onFocus?.()
          setIsOpen(prev => !prev)
        }}
      >
        {displayValue}
      </span>

      {isOpen && (
        <div className="date-calendar-dropdown">
          {/* Month navigation */}
          <div className="date-calendar-header">
            <span className="date-calendar-month-label">{monthLabel}</span>
            <div className="date-calendar-nav">
              <button type="button" className="date-calendar-nav-btn" onClick={prevMonth}>
                <CaretLeft size={16} weight="bold" />
              </button>
              <button type="button" className="date-calendar-nav-btn" onClick={nextMonth}>
                <CaretRight size={16} weight="bold" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="date-calendar-grid">
            {WEEKDAY_HEADERS.map((label, i) => (
              <div key={`h-${i}`} className="date-calendar-weekday">{label}</div>
            ))}

            {/* Day cells */}
            {calendarDays.map((day, i) => {
              if (day === null) {
                return <div key={`e-${i}`} className="date-calendar-cell empty" />
              }

              const cellDate = new Date(viewYear, viewMonth, day)
              const isToday = isSameDay(cellDate, today)
              const isSelected = isSameDay(cellDate, selectedDate)

              return (
                <button
                  key={`d-${day}`}
                  type="button"
                  className={[
                    'date-calendar-cell',
                    isToday && !isSelected ? 'today' : '',
                    isSelected ? 'selected' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => handleDayClick(day)}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function DateInputMobile({ value, onChange, onFocus, onBlur, isEditing, className }: DateInputProps) {
  const [dateValue, setDateValue] = useState('')

  useEffect(() => {
    if (value) {
      const date = new Date(value)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      setDateValue(`${year}-${month}-${day}`)
    }
  }, [value])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setDateValue(newDate)

    const date = new Date(value)
    const [year, month, day] = newDate.split('-').map(Number)
    date.setFullYear(year, month - 1, day)

    onChange(date.toISOString())
  }

  const displayValue = formatDisplay(value)

  if (!isEditing) {
    return <span className={className}>{displayValue}</span>
  }

  return (
    <div className="date-input-container">
      <span className={`date-input-display ${className || ''}`}>{displayValue}</span>
      <input
        type="date"
        className="date-input-mobile-native"
        value={dateValue}
        onChange={handleDateChange}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </div>
  )
}

export function DateInput(props: DateInputProps) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  return isMobile ? <DateInputMobile {...props} /> : <DateInputDesktop {...props} />
}
