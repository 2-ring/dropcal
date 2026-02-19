import type { Session, CalendarEvent } from './types';

const API_URL = 'https://api.dropcal.ai';

// Auth state is injected by the background script before each call
let _authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  _authToken = token;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// ===== Authenticated endpoints =====

export async function createTextSession(text: string): Promise<Session> {
  const response = await fetch(`${API_URL}/sessions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ text }),
  });
  const data = await handleResponse<{ session: Session }>(response);
  return data.session;
}

export async function uploadImage(imageUrl: string): Promise<Session> {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageResponse.status}`);
  }

  const blob = await imageResponse.blob();
  const urlPath = new URL(imageUrl).pathname;
  const filename = urlPath.split('/').pop() || 'image.png';

  const formData = new FormData();
  formData.append('file', blob, filename);

  const headers: Record<string, string> = {};
  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await handleResponse<{ session: Session }>(response);
  return data.session;
}

export async function getSession(sessionId: string): Promise<Session> {
  const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  const data = await handleResponse<{ session: Session }>(response);
  return data.session;
}

export async function getSessionEvents(
  sessionId: string,
): Promise<{ events: CalendarEvent[]; count: number }> {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/events`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return handleResponse(response);
}

// Fetch the authenticated user's preferences (theme_mode, etc.)
export async function getUserPreferences(): Promise<{ theme_mode?: string }> {
  const response = await fetch(`${API_URL}/auth/profile`, {
    method: 'GET',
    headers: authHeaders(),
  });
  const data = await handleResponse<{ user: { preferences?: { theme_mode?: string } } }>(response);
  return data.user.preferences || {};
}

// Upload a file (from drop zone / file picker) as FormData
export async function uploadFile(
  fileData: Uint8Array,
  filename: string,
  mimeType: string,
): Promise<Session> {
  const blob = new Blob([fileData], { type: mimeType });
  const formData = new FormData();
  formData.append('file', blob, filename);

  const headers: Record<string, string> = {};
  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await handleResponse<{ session: Session }>(response);
  return data.session;
}
