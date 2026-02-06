/**
 * Guest Session Manager for DropCal Mobile.
 * Manages temporary sessions for users who aren't signed in.
 * Stores access tokens for guest sessions in AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_SESSIONS_KEY = '@dropcal:guest_sessions';

interface GuestSessionData {
  sessionId: string;
  accessToken: string;
  createdAt: number;
}

/**
 * Store a guest session access token.
 * Associates the access token with the session ID for later retrieval.
 *
 * @param sessionId - The session ID from the backend
 * @param accessToken - The access token for this guest session
 */
async function storeAccessToken(sessionId: string, accessToken: string): Promise<void> {
  try {
    const sessions = await getAllSessions();
    sessions[sessionId] = {
      sessionId,
      accessToken,
      createdAt: Date.now(),
    };

    await AsyncStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to store guest session access token:', error);
    throw error;
  }
}

/**
 * Get the access token for a specific guest session.
 *
 * @param sessionId - The session ID to retrieve the token for
 * @returns The access token, or null if not found
 */
function getAccessToken(sessionId: string): string | null {
  // Synchronous version for backend-client.ts compatibility
  // In production, this should be called after async initialization
  try {
    // This is a temporary implementation - in a real app, you'd want to
    // initialize this asynchronously and cache the result
    console.warn(
      'GuestSessionManager.getAccessToken called synchronously - use getAccessTokenAsync instead'
    );
    return null;
  } catch (error) {
    console.error('Failed to get guest session access token:', error);
    return null;
  }
}

/**
 * Get the access token for a specific guest session (async version).
 *
 * @param sessionId - The session ID to retrieve the token for
 * @returns The access token, or null if not found
 */
async function getAccessTokenAsync(sessionId: string): Promise<string | null> {
  try {
    const sessions = await getAllSessions();
    return sessions[sessionId]?.accessToken ?? null;
  } catch (error) {
    console.error('Failed to get guest session access token:', error);
    return null;
  }
}

/**
 * Get all stored guest sessions.
 *
 * @returns Object mapping session IDs to session data
 */
async function getAllSessions(): Promise<Record<string, GuestSessionData>> {
  try {
    const sessionsJson = await AsyncStorage.getItem(GUEST_SESSIONS_KEY);
    if (!sessionsJson) {
      return {};
    }

    return JSON.parse(sessionsJson);
  } catch (error) {
    console.error('Failed to get all guest sessions:', error);
    return {};
  }
}

/**
 * Get all guest session IDs.
 * Useful for migrating sessions when user signs in.
 *
 * @returns Array of session IDs
 */
async function getAllSessionIds(): Promise<string[]> {
  try {
    const sessions = await getAllSessions();
    return Object.keys(sessions);
  } catch (error) {
    console.error('Failed to get guest session IDs:', error);
    return [];
  }
}

/**
 * Remove a specific guest session.
 *
 * @param sessionId - The session ID to remove
 */
async function removeSession(sessionId: string): Promise<void> {
  try {
    const sessions = await getAllSessions();
    delete sessions[sessionId];

    await AsyncStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to remove guest session:', error);
    throw error;
  }
}

/**
 * Clear all guest sessions.
 * Called when user signs in and sessions are migrated.
 */
async function clearAllSessions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GUEST_SESSIONS_KEY);
  } catch (error) {
    console.error('Failed to clear guest sessions:', error);
    throw error;
  }
}

/**
 * Clean up old guest sessions (older than 7 days).
 * Prevents storage from growing unbounded.
 */
async function cleanupOldSessions(): Promise<void> {
  try {
    const sessions = await getAllSessions();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const activeSessions: Record<string, GuestSessionData> = {};

    for (const [sessionId, data] of Object.entries(sessions)) {
      if (data.createdAt > sevenDaysAgo) {
        activeSessions[sessionId] = data;
      }
    }

    await AsyncStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(activeSessions));
  } catch (error) {
    console.error('Failed to cleanup old guest sessions:', error);
  }
}

/**
 * Guest Session Manager API
 */
export const GuestSessionManager = {
  storeAccessToken,
  getAccessToken, // Sync version (deprecated, use getAccessTokenAsync)
  getAccessTokenAsync,
  getAllSessions,
  getAllSessionIds,
  removeSession,
  clearAllSessions,
  cleanupOldSessions,
};
