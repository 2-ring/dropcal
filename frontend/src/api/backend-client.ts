/**
 * Backend API client for DropCal.
 * Handles all API requests with authentication.
 */

import { getAccessToken } from '../auth/supabase';
import type {
  Session,
  CreateSessionResponse,
  GetSessionResponse,
  GetSessionsResponse,
  UploadFileResponse,
  ApiError,
} from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Get authorization headers with current access token.
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Handle API response and throw errors if needed.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      error: `HTTP ${response.status}: ${response.statusText}`,
    }));

    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

/**
 * Create a new text session.
 */
export async function createTextSession(text: string): Promise<Session> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      input_type: 'text',
      input_content: text,
    }),
  });

  const data = await handleResponse<CreateSessionResponse>(response);
  return data.session;
}

/**
 * Upload a file (image or audio) and create a session.
 */
export async function uploadFile(
  file: File,
  type: 'image' | 'audio'
): Promise<{ session: Session; file_url: string }> {
  const token = await getAccessToken();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('input_type', type);

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await handleResponse<UploadFileResponse>(response);
  return {
    session: data.session,
    file_url: data.file_url,
  };
}

/**
 * Get a single session by ID.
 */
export async function getSession(sessionId: string): Promise<Session> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
    method: 'GET',
    headers,
  });

  const data = await handleResponse<GetSessionResponse>(response);
  return data.session;
}

/**
 * Get all sessions for the current user.
 */
export async function getUserSessions(limit: number = 50): Promise<Session[]> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_URL}/api/sessions?limit=${limit}`, {
    method: 'GET',
    headers,
  });

  const data = await handleResponse<GetSessionsResponse>(response);
  return data.sessions;
}

/**
 * Health check endpoint.
 */
export async function healthCheck(): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_URL}/api/health`, {
    method: 'GET',
  });

  return handleResponse(response);
}
