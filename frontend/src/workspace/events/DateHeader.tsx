interface DateHeaderProps {
  date: Date
  // TODO: Add dateContext prop when implementing different display modes
  // dateContext?: { sameDay: boolean, sameMonth: boolean, sameYear: boolean, currentYear: boolean }
}

interface MonthHeaderProps {
  date: Date
}

export function MonthHeader({ date }: MonthHeaderProps) {
  // Format as "February 2026" or just "February" if current year
  const currentYear = new Date().getFullYear()
  const eventYear = date.getFullYear()
  const includeYear = eventYear !== currentYear

  const monthYear = date.toLocaleDateString('en-US', {
    month: 'long',
    ...(includeYear && { year: 'numeric' })
  })

  return (
    <div className="event-section-header">
      <h2 className="event-section-header-text">{monthYear}</h2>
    </div>
  )
}

export function DateHeader({ date }: DateHeaderProps) {
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()

  // Get day of week (short format: Mon, Tue, Wed, etc.)
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' })

  // Get date number (1-31)
  const dateNumber = date.getDate()

  // TODO: Implement different display formats based on dateContext:
  // - Same day: Could hide date headers entirely, or show just one
  // - Same month (current implementation): Show day-of-week + date number
  // - Different months: Show month abbreviation + date number
  // - Different years: Include year in display

  return (
    <div className="event-date-header-timing">
      {/* Day of week label - always show abbreviation */}
      <div className="event-date-day-label">
        {dayOfWeek}
      </div>

      {/* Large circular date number */}
      <div className={`event-date-circle ${isToday ? 'today' : ''}`}>
        <span className="event-date-number">{dateNumber}</span>
      </div>
    </div>
  )
}
