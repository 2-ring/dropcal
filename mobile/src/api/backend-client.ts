/**
 * Backend API client for DropCal Mobile.
 *
 * Creates a shared API client with platform-specific config (RN env, Supabase auth),
 * then re-exports all methods so existing import paths continue to work.
 *
 * Platform-specific functions (RN file uploads, legacy compat shims) are defined locally.
 */

import { createApiClient } from '@dropcal/shared';
import type { Session } from '@dropcal/shared';
import { getAccessToken } from '../auth/supabase';
import { API_URL } from './config';

const client = createApiClient({
  baseUrl: API_URL,
  getAccessToken,
});

// Re-export all shared client methods
export const {
  createTextSession,
  getSession,
  getUserSessions,
  pollSession,
  healthCheck,
  syncUserProfile,
  getUserProfile,
  updateUserProfile,
  updateUserPreferences,
  storeGoogleCalendarTokens,
  pushEvents,
  syncSessionInbound,
  getSessionEvents,
  updateEvent,
  deleteEvent,
  applyModifications,
  checkEventConflicts,
  sendMicrosoftTokens,
  sendAppleCredentials,
  getCalendarProviders,
  setPrimaryCalendarProvider,
  disconnectCalendarProvider,
  getUserPreferences,
  deleteAccount,
  createCheckoutSession,
  createPortalSession,
  getBillingStatus,
  createGuestTextSession,
  getGuestSession,
  migrateGuestSessions,
} = client;

// ============================================================================
// Platform-specific: File uploads (wraps RN file descriptor → FormData)
// ============================================================================

/**
 * Upload a file and create a session.
 *
 * Accepts either a browser File object or an RN file descriptor
 * ({ uri, name, type }). Both are appended to FormData and sent to
 * the backend, which auto-detects the file type.
 */
export async function uploadFile(
  file: File | { uri: string; name: string; type: string },
): Promise<{ session: Session; file_url: string }> {
  const formData = new FormData();
  formData.append('file', file as any);
  return client.uploadFile(formData);
}

/**
 * Upload file as guest (no auth).
 */
export async function uploadGuestFile(
  file: File | { uri: string; name: string; type: string },
): Promise<{ session: Session; file_url: string }> {
  const formData = new FormData();
  formData.append('file', file as any);
  return client.uploadGuestFile(formData);
}

// ============================================================================
// Legacy compatibility shims (called from existing mobile screens)
// ============================================================================

/**
 * @deprecated Use pushEvents() instead. Kept for AppContainer.tsx compat.
 *
 * Maps the old addSessionToCalendar(sessionId, events?, eventIds?) signature
 * to the new pushEvents(eventIds, { sessionId, events }) API.
 */
export async function addSessionToCalendar(
  sessionId: string,
  events?: any[],
  eventIds?: string[],
): Promise<{
  success: boolean;
  calendar_event_ids: string[];
  num_events_created: number;
  conflicts: any[];
  has_conflicts: boolean;
  message: string;
}> {
  const result = await pushEvents(eventIds || [], { sessionId, events });
  return {
    success: result.success,
    calendar_event_ids: result.calendar_event_ids,
    num_events_created: result.num_created,
    conflicts: result.conflicts,
    has_conflicts: result.has_conflicts,
    message: result.message,
  };
}

/**
 * @deprecated The /edit-event endpoint has been replaced by the modification system.
 * Use applyModifications() for batch edits. Kept for EventsListScreen.tsx compat.
 */
export async function editEvent(
  event: {
    summary: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    location?: string;
    description?: string;
    recurrence?: string[];
    calendar?: string;
  },
  instruction: string,
): Promise<{
  modified_event: {
    summary: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    location?: string;
    description?: string;
    recurrence?: string[];
    calendar?: string;
  };
}> {
  const token = await getAccessToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/edit-event`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ event, instruction }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}
