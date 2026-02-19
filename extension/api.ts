import type { Session, CalendarEvent } from './types';

const API_URL = 'https://api.dropcal.ai';

export async function createGuestTextSession(text: string): Promise<Session> {
  const response = await fetch(`${API_URL}/sessions/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input_type: 'text',
      input_content: text,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.session;
}

export async function uploadGuestImage(imageUrl: string): Promise<Session> {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageResponse.status}`);
  }

  const blob = await imageResponse.blob();
  const urlPath = new URL(imageUrl).pathname;
  const filename = urlPath.split('/').pop() || 'image.png';

  const formData = new FormData();
  formData.append('file', blob, filename);

  const response = await fetch(`${API_URL}/upload/guest`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.session;
}

export async function getGuestSession(
  sessionId: string,
  accessToken: string,
): Promise<Session> {
  const response = await fetch(
    `${API_URL}/sessions/guest/${sessionId}?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.session;
}

export async function getGuestSessionEvents(
  sessionId: string,
  accessToken: string,
): Promise<{ events: CalendarEvent[]; count: number }> {
  const response = await fetch(
    `${API_URL}/sessions/guest/${sessionId}/events?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}
