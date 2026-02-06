/**
 * Date and time formatting utilities for DropCal
 */

/**
 * Format a date to a readable string (e.g., "Jan 15, 2024")
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return d.toLocaleDateString('en-US', options);
};

/**
 * Format a date to a full string (e.g., "Monday, January 15, 2024")
 */
export const formatDateFull = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return d.toLocaleDateString('en-US', options);
};

/**
 * Format a date to a short string (e.g., "1/15/24")
 */
export const formatDateShort = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: '2-digit',
    month: 'numeric',
    day: 'numeric',
  });
};

/**
 * Format time to a readable string (e.g., "2:30 PM")
 */
export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Format time to 24-hour format (e.g., "14:30")
 */
export const formatTime24 = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/**
 * Format date and time together (e.g., "Jan 15, 2024 at 2:30 PM")
 */
export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${formatDate(d)} at ${formatTime(d)}`;
};

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export const getRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSec = Math.abs(Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  const isPast = diffMs < 0;
  const prefix = isPast ? '' : 'in ';
  const suffix = isPast ? ' ago' : '';

  if (diffSec < 60) {
    return isPast ? 'just now' : 'in a few seconds';
  } else if (diffMin < 60) {
    return `${prefix}${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'}${suffix}`;
  } else if (diffHour < 24) {
    return `${prefix}${diffHour} ${diffHour === 1 ? 'hour' : 'hours'}${suffix}`;
  } else if (diffDay < 7) {
    return `${prefix}${diffDay} ${diffDay === 1 ? 'day' : 'days'}${suffix}`;
  } else if (diffWeek < 4) {
    return `${prefix}${diffWeek} ${diffWeek === 1 ? 'week' : 'weeks'}${suffix}`;
  } else if (diffMonth < 12) {
    return `${prefix}${diffMonth} ${diffMonth === 1 ? 'month' : 'months'}${suffix}`;
  } else {
    return `${prefix}${diffYear} ${diffYear === 1 ? 'year' : 'years'}${suffix}`;
  }
};

/**
 * Check if date is today
 */
export const isToday = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

/**
 * Check if date is tomorrow
 */
export const isTomorrow = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear()
  );
};

/**
 * Check if date is yesterday
 */
export const isYesterday = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
};

/**
 * Get day name (e.g., "Monday")
 */
export const getDayName = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { weekday: 'long' });
};

/**
 * Get short day name (e.g., "Mon")
 */
export const getDayNameShort = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { weekday: 'short' });
};

/**
 * Get month name (e.g., "January")
 */
export const getMonthName = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'long' });
};

/**
 * Get short month name (e.g., "Jan")
 */
export const getMonthNameShort = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short' });
};

/**
 * Format date for display in event list (e.g., "Today", "Tomorrow", "Jan 15")
 */
export const formatEventDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';

  const now = new Date();
  const diffDays = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Within a week
  if (diffDays < 7 && diffDays > 0) {
    return getDayName(d);
  }

  // Same year
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Different year
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Format time range (e.g., "2:00 PM - 3:30 PM")
 */
export const formatTimeRange = (startDate: Date | string, endDate: Date | string): string => {
  return `${formatTime(startDate)} - ${formatTime(endDate)}`;
};

/**
 * Get ISO date string (YYYY-MM-DD)
 */
export const toISODate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

/**
 * Get ISO time string (HH:MM)
 */
export const toISOTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Parse date from various formats
 */
export const parseDate = (dateString: string): Date | null => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
};

/**
 * Check if a date is in the past
 */
export const isPast = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() < Date.now();
};

/**
 * Check if a date is in the future
 */
export const isFuture = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() > Date.now();
};

/**
 * Get start of day
 */
export const startOfDay = (date: Date | string): Date => {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day
 */
export const endOfDay = (date: Date | string): Date => {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Add days to a date
 */
export const addDays = (date: Date | string, days: number): Date => {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Subtract days from a date
 */
export const subtractDays = (date: Date | string, days: number): Date => {
  return addDays(date, -days);
};

/**
 * Default export with all utilities
 */
export const dateTime = {
  format: formatDate,
  formatFull: formatDateFull,
  formatShort: formatDateShort,
  formatTime,
  formatTime24,
  formatDateTime,
  formatEventDate,
  formatTimeRange,
  getRelativeTime,
  isToday,
  isTomorrow,
  isYesterday,
  isPast,
  isFuture,
  getDayName,
  getDayNameShort,
  getMonthName,
  getMonthNameShort,
  toISODate,
  toISOTime,
  parseDate,
  startOfDay,
  endOfDay,
  addDays,
  subtractDays,
};

export default dateTime;
