# Backend API Client - Mobile

This directory contains the ported backend API client for DropCal Mobile, adapted from the web frontend.

## Files

- **`backend-client.ts`** - Main API client with all backend endpoints
- **`types.ts`** - TypeScript types for API requests and responses
- **`config.ts`** - API URL configuration
- **`index.ts`** - Barrel exports for convenient imports

## Setup

### 1. Configure API URL

Edit [`config.ts`](config.ts) to set your backend API URL:

```typescript
export const API_URL = __DEV__
  ? 'http://192.168.1.100:5000'  // Your local network IP
  : 'https://api.dropcal.com';    // Production URL
```

**Important for physical devices:** Use your computer's local network IP address, not `localhost`. Find it with:
- **macOS/Linux:** `ifconfig | grep "inet "`
- **Windows:** `ipconfig`

### 2. Authentication Integration (Task 41 Required)

The backend client currently uses **stub functions** for authentication. These will be replaced when **Task 41: Port AuthContext** is completed.

**Current stubs:**
- `getAccessToken()` - Returns null
- `GuestSessionManager.getAccessToken()` - Returns null

**After Task 41:**
Replace the stub imports in [`backend-client.ts`](backend-client.ts):

```typescript
// Remove stubs and uncomment these imports:
import { getAccessToken } from '../auth/supabase';
import { GuestSessionManager } from '../auth/GuestSessionManager';
```

## Usage

Import API functions from the api module:

```typescript
import {
  createTextSession,
  uploadFile,
  getUserSessions,
  pollSession,
  // ... other functions
} from '../api';

// Example: Create a text session
const session = await createTextSession('Meeting tomorrow at 2pm');

// Example: Poll session until processed
await pollSession(session.id, (updatedSession) => {
  console.log('Status:', updatedSession.status);
});
```

## Available Endpoints

### Session Management
- `createTextSession(text)` - Create session from text
- `uploadFile(file, type)` - Upload image or audio file
- `getSession(sessionId)` - Get single session
- `getUserSessions(limit?)` - Get user's sessions
- `pollSession(sessionId, onUpdate?, intervalMs?, isGuest?)` - Poll until processed

### Authentication & Profile
- `syncUserProfile()` - Sync user profile after sign-in
- `getUserProfile()` - Get current user profile
- `updateUserProfile(updates)` - Update user profile

### Google Calendar
- `storeGoogleCalendarTokens(providerToken)` - Store OAuth tokens
- `checkGoogleCalendarStatus()` - Check calendar connection status
- `addSessionToCalendar(sessionId, events?)` - Add events to calendar

### Calendar Providers
- `getCalendarProviders()` - Get all connected providers
- `setPrimaryCalendarProvider(provider)` - Set primary provider
- `disconnectCalendarProvider(provider)` - Disconnect provider

### Guest Mode (No Auth)
- `createGuestTextSession(text)` - Create guest session
- `uploadGuestFile(file, type)` - Upload file as guest
- `getGuestSession(sessionId)` - Get guest session
- `migrateGuestSessions(sessionIds)` - Migrate guest sessions after sign-in

## Notes

- ✅ **Fetch API works natively in React Native** - No changes needed
- ✅ **FormData works for file uploads** - Compatible with React Native
- ⚠️ **Auth stubs are temporary** - Will be replaced by Task 41
- ⚠️ **Configure API_URL before testing** - See config.ts

## Next Steps

1. **Wait for Task 41** (Port AuthContext) to complete
2. Replace auth stubs with real implementations
3. Test all endpoints with real auth tokens
4. Configure production API URL
