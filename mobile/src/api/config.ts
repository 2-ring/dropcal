/**
 * API configuration for DropCal Mobile.
 */

// Development: Use your local IP address (not localhost) for physical devices
// Example: http://192.168.1.100:5000
// Production: Use your deployed backend URL
//
// NOTE: No trailing /api/ prefix — the shared API client appends route paths
// directly (e.g. /sessions, /auth/sync-profile).
export const API_URL = __DEV__
  ? 'http://localhost:5000'  // Development (iOS simulator/Android emulator)
  : 'https://api.dropcal.ai';  // Production
