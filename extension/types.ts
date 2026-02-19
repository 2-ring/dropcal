// Subset of backend Session model — only fields the extension needs
export interface Session {
  id: string;
  status: 'pending' | 'processing' | 'processed' | 'error';
  title?: string | null;
  event_ids?: string[];
  error_message?: string | null;
  created_at: string;
}

// Subset of backend CalendarEvent — only fields the popup displays
export interface CalendarDateTime {
  dateTime?: string;
  date?: string;
  timeZone: string;
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  start: CalendarDateTime;
  end: CalendarDateTime;
  location?: string;
}

// Auth state stored in chrome.storage.local (persists across browser restarts)
export interface AuthState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
}

// Extension state stored in chrome.storage.session
export interface ActiveJob {
  sessionId: string;
  status: 'polling' | 'processed' | 'error';
  eventCount: number;
  errorMessage?: string;
  sessionTitle?: string | null;
  events?: CalendarEvent[];
  createdAt: number;
}

// Message types between background service worker, popup, and content script
export type ExtensionMessage =
  | { type: 'GET_STATUS' }
  | { type: 'STATUS_UPDATE'; job: ActiveJob | null }
  | { type: 'OPEN_SESSION'; sessionId: string }
  | { type: 'CLEAR_JOB' }
  | { type: 'SIGN_IN' }
  | { type: 'GET_AUTH' }
  | { type: 'AUTH_TOKEN'; accessToken: string; refreshToken: string; expiresAt: number }
  | { type: 'AUTH_SIGNED_OUT' };
