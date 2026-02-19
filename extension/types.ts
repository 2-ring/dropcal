// Subset of backend Session model — only fields the extension needs
export interface Session {
  id: string;
  status: 'pending' | 'processing' | 'processed' | 'error';
  title?: string | null;
  icon?: string | null;
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
  description?: string;
  recurrence?: string[];
}

// Auth state stored in chrome.storage.local (persists across browser restarts)
export interface AuthState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in seconds
}

// Phase 1 — single active job (kept for migration + context menu flow)
export interface ActiveJob {
  sessionId: string;
  status: 'polling' | 'processed' | 'error';
  eventCount: number;
  errorMessage?: string;
  sessionTitle?: string | null;
  events?: CalendarEvent[];
  createdAt: number;
}

// Phase 2 — persistent session history
export interface SessionRecord {
  sessionId: string;
  status: 'polling' | 'processed' | 'error';
  title: string | null;
  icon?: string | null;
  eventCount: number;
  eventSummaries: string[]; // First 3 event titles for popup subtitle
  events: CalendarEvent[]; // Full events for sidebar rendering
  errorMessage?: string;
  createdAt: number;
  inputType: 'text' | 'image' | 'page' | 'file';
  pageUrl?: string;
}

export interface SessionHistory {
  sessions: SessionRecord[]; // Most recent first, max 10
}

// Message types between background service worker, popup, and content script
export type ExtensionMessage =
  // Auth (content script ↔ background)
  | { type: 'AUTH_TOKEN'; accessToken: string; refreshToken: string; expiresAt: number }
  | { type: 'AUTH_SIGNED_OUT' }
  // Theme (content script → background)
  | { type: 'THEME_CHANGED'; themeMode: string }
  // Popup queries
  | { type: 'GET_STATUS' }
  | { type: 'GET_AUTH' }
  | { type: 'SIGN_IN' }
  // Phase 1 (context menu)
  | { type: 'OPEN_SESSION'; sessionId: string }
  | { type: 'CLEAR_JOB' }
  // Phase 2 — popup inputs
  | { type: 'CAPTURE_PAGE' }
  | { type: 'SUBMIT_TEXT'; text: string }
  | { type: 'SUBMIT_FILE'; data: number[]; name: string; mimeType: string } // ArrayBuffer as number[] for messaging
  // Phase 2 — history
  | { type: 'GET_HISTORY' }
  // Phase 2 — sidebar
  | { type: 'OPEN_SIDEBAR'; sessionId: string };
