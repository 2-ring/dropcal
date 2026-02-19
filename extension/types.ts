// Subset of backend Session model — only fields the extension needs
export interface Session {
  id: string;
  status: 'pending' | 'processing' | 'processed' | 'error';
  title?: string | null;
  event_ids?: string[];
  access_token?: string;
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

// Extension state stored in chrome.storage.session
export interface ActiveJob {
  sessionId: string;
  accessToken: string;
  status: 'polling' | 'processed' | 'error';
  eventCount: number;
  errorMessage?: string;
  sessionTitle?: string | null;
  events?: CalendarEvent[];
  createdAt: number;
}

// Message types between background service worker and popup
export type ExtensionMessage =
  | { type: 'GET_STATUS' }
  | { type: 'STATUS_UPDATE'; job: ActiveJob | null }
  | { type: 'OPEN_SESSION'; sessionId: string; accessToken: string }
  | { type: 'CLEAR_JOB' };
