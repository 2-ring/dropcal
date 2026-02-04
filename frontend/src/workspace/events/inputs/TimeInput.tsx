import { useState, useRef, useEffect } from 'react'
import './TimeInput.css'

export type CursorBehavior = 'select-all' | 'end' | 'before-suffix'

export interface TimeInputProps {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  isEditing?: boolean
  placeholder?: string
  className?: string
  cursorBehavior?: CursorBehavior
}

const setCursorPosition = (input: HTMLInputElement, behavior: CursorBehavior, value: string) => {
  switch (behavior) {
    case 'select-all':
      input.select()
      break
    case 'end':
      input.setSelectionRange(value.length, value.length)
      break
    case 'before-suffix':
      // For time inputs, position cursor before AM/PM
      const amPmMatch = value.match(/\s?(AM|PM)$/i)
      if (amPmMatch) {
        const position = value.length - amPmMatch[0].length
        input.setSelectionRange(position, position)
      } else {
        input.setSelectionRange(value.length, value.length)
      }
      break
  }
}

export function TimeInputDesktop({ value, onChange, onFocus, onBlur, isEditing, placeholder, className, cursorBehavior = 'before-suffix' }: TimeInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value) {
      const date = new Date(value)
      setInputValue(date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }))
    }
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      setCursorPosition(inputRef.current, cursorBehavior, inputValue)
    }
  }, [isEditing, cursorBehavior, inputValue])

  const generateTimeSuggestions = () => {
    const times: { value: string; label: string }[] = []
    const baseDate = new Date(value)
    const today = new Date(baseDate.toDateString())

    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = new Date(today)
        time.setHours(hour, minute, 0, 0)

        const duration = Math.abs(time.getTime() - baseDate.getTime()) / (1000 * 60)
        const hours = Math.floor(duration / 60)
        const mins = duration % 60

        let durationText = ''
        if (hours > 0 && mins > 0) {
          durationText = ` (${hours} hr ${mins} mins)`
        } else if (hours > 0) {
          durationText = ` (${hours} hr)`
        } else if (mins > 0) {
          durationText = ` (${mins} mins)`
        }

        times.push({
          value: time.toISOString(),
          label: time.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }) + durationText
        })
      }
    }

    return times
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    if (newValue.length > 0) {
      setIsOpen(true)
    }
  }

  const handleTimeSelect = (timeValue: string) => {
    onChange(timeValue)
    setIsOpen(false)
  }

  const handleInputBlur = () => {
    setTimeout(() => {
      setIsOpen(false)
      onBlur?.()
    }, 200)
  }

  const handleInputFocus = () => {
    onFocus?.()
  }

  const timeSuggestions = generateTimeSuggestions()
  const filteredSuggestions = inputValue
    ? timeSuggestions.filter(t =>
        t.label.toLowerCase().includes(inputValue.toLowerCase())
      ).slice(0, 10)
    : []

  return (
    <div className="time-input-container">
      <input
        ref={inputRef}
        type="text"
        className={`time-input ${className || ''}`}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder || 'Enter time'}
        readOnly={!isEditing}
      />

      {isOpen && filteredSuggestions.length > 0 && (
        <div className="time-dropdown">
          {filteredSuggestions.map((time, index) => (
            <button
              key={index}
              className="time-option"
              onClick={() => handleTimeSelect(time.value)}
              type="button"
            >
              {time.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function TimeInputMobile({ value, onChange, onFocus, onBlur, isEditing, placeholder, className, cursorBehavior = 'before-suffix' }: TimeInputProps) {
  const [timeValue, setTimeValue] = useState('')

  useEffect(() => {
    if (value) {
      const date = new Date(value)
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      setTimeValue(`${hours}:${minutes}`)
    }
  }, [value])

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    setTimeValue(newTime)

    const [hours, minutes] = newTime.split(':').map(Number)
    const date = new Date(value)
    date.setHours(hours, minutes, 0, 0)

    onChange(date.toISOString())
  }

  return (
    <input
      type="time"
      className={`time-input-mobile ${className || ''}`}
      value={timeValue}
      onChange={handleTimeChange}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      readOnly={!isEditing}
    />
  )
}

export function TimeInput(props: TimeInputProps) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  return isMobile ? <TimeInputMobile {...props} /> : <TimeInputDesktop {...props} />
}
