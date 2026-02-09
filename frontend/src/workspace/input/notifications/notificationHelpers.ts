import { FileX, CheckCircle, Warning, Info } from '@phosphor-icons/react'
import type { Notification } from './types'

/**
 * Helper to create friendly error notifications from validation errors
 */
export function createValidationErrorNotification(error: string): Notification {
  // Convert technical error messages to friendly ones
  let friendlyMessage = error

  if (error.includes('not supported') || error.includes('File type')) {
    friendlyMessage = "Sorry, you can't upload that file type! Try something else."
  } else if (error.includes('too large')) {
    friendlyMessage = "Whoa, that file's too big! Try a smaller one."
  } else if (error.includes('empty')) {
    friendlyMessage = "This file seems to be empty. Pick a different one!"
  }

  return {
    id: `validation-error-${Date.now()}`,
    icon: FileX,
    iconWeight: 'duotone',
    message: friendlyMessage,
    variant: 'error',
    persistent: false,
    priority: 10,
  }
}

/**
 * Helper to create success notifications
 */
export function createSuccessNotification(message: string, ttl = 3000): Notification {
  return {
    id: `success-${Date.now()}`,
    icon: CheckCircle,
    iconWeight: 'duotone',
    message,
    variant: 'success',
    persistent: false,
    priority: 5,
    ttl,
  }
}

/**
 * Helper to create warning notifications
 */
export function createWarningNotification(message: string, ttl = 5000): Notification {
  return {
    id: `warning-${Date.now()}`,
    icon: Warning,
    iconWeight: 'duotone',
    message,
    variant: 'warning',
    persistent: false,
    priority: 7,
    ttl,
  }
}

/**
 * Helper to create info notifications
 */
export function createInfoNotification(message: string, persistent = false): Notification {
  return {
    id: `info-${Date.now()}`,
    icon: Info,
    iconWeight: 'duotone',
    message,
    variant: 'info',
    persistent,
    priority: 0,
  }
}

/**
 * Helper to create error notifications
 */
export function createErrorNotification(message: string): Notification {
  return {
    id: `error-${Date.now()}`,
    icon: FileX,
    iconWeight: 'duotone',
    message,
    variant: 'error',
    persistent: false,
    priority: 10,
  }
}

const ERROR_MESSAGE_MAP: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /No events found/i, message: "We couldn't find any events in there. Try rephrasing or adding more details!" },
  { pattern: /empty/i, message: "This file seems to be empty. Pick a different one!" },
  { pattern: /Unsupported file type/i, message: "Sorry, that file type isn't supported! Try something else." },
  { pattern: /too large|too long/i, message: "Whoa, that's too big! Try something shorter or split it up." },
  { pattern: /timed? ?out|timeout/i, message: "That took a bit too long. Mind trying again?" },
  { pattern: /not connected|not authenticated|401/i, message: "Looks like your calendar isn't connected. Try signing in again!" },
  { pattern: /No content found|Failed to fetch URL/i, message: "We couldn't grab anything from that link. Double-check the URL and try again!" },
  { pattern: /rate limit|429|Too Many Requests/i, message: "Whoa, slow down! Give it a sec and try again." },
  { pattern: /network|Failed to fetch$/i, message: "Hmm, we're having trouble connecting. Check your internet and try again!" },
]

/**
 * Convert a raw error into a casual, user-friendly message.
 * Falls back to the generic "Oops!" message when no specific pattern matches.
 */
export function getFriendlyErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)

  for (const { pattern, message } of ERROR_MESSAGE_MAP) {
    if (pattern.test(raw)) return message
  }

  return "Oops! Something went wrong. Mind trying that again?"
}
