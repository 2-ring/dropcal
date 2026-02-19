# DropCal Browser Extension — Specification

## Context

Chrome extension (Manifest V3) that lets users right-click selected text or images on any page, send them to the DropCal pipeline via context menu, and get a styled notification popup when events are extracted. Minimal viable extension — no sidebar, no page capture, no event preview. Just: right-click → process → notify → link to dropcal.ai.

## Architecture

```
extension/
├── manifest.json           # MV3 manifest
├── background.ts           # Service worker: context menus, API calls, polling, badge
├── api.ts                  # Guest session API client
├── types.ts                # Shared types (Session, ActiveJob, messages)
├── popup/
│   ├── popup.html          # Static HTML shell (4 states: idle/processing/success/error)
│   ├── popup.css           # Styled to match DropCal design system
│   └── popup.ts            # Vanilla TS — reads chrome.storage, handles button clicks
├── icons/
│   ├── icon16.png          # Generated from brand/icon/circle/blue.png
│   ├── icon48.png
│   └── icon128.png
├── build.mjs               # esbuild script (compiles TS → JS)
├── package.json            # Only devDeps: esbuild, @types/chrome, typescript
└── tsconfig.json
```

**No framework.** The extension is ~800 lines total. Plain TypeScript compiled with esbuild, static HTML/CSS popup, no React. Zero runtime dependencies.

## Core Flow

1. User selects text (or right-clicks an image) → context menu shows "Send to DropCal"
2. Service worker captures `info.selectionText` or `info.srcUrl`
3. Service worker calls `POST /api/sessions/guest` (text) or `POST /api/upload/guest` (image)
4. Badge shows `...` (blue) during processing
5. Service worker polls `GET /api/sessions/guest/{id}?access_token=...` every 2s (max 5min)
6. On completion: badge shows event count (green), OS notification fires
7. User clicks extension icon → popup shows "3 Events Scheduled" + "See in DropCal →"
8. Button opens `https://dropcal.ai/s/{sessionId}?token={accessToken}` in new tab

## Files to Create

### 1. `extension/manifest.json`
- `manifest_version: 3`
- Permissions: `contextMenus`, `storage`, `notifications`, `activeTab`
- Host permissions: `https://api.dropcal.ai/*` (bypasses CORS from service worker)
- Background service worker: `background.js` (module type)
- Action popup: `popup/popup.html`

### 2. `extension/types.ts`
- `Session` — subset of backend session model (id, status, title, event_ids, access_token, error_message)
- `CalendarEvent` — subset (id, summary, start, end, location)
- `ActiveJob` — extension state stored in `chrome.storage.session`:
  - `sessionId`, `accessToken`, `status` (polling|processed|error), `eventCount`, `errorMessage`, `sessionTitle`
- Message types: `GET_STATUS`, `OPEN_SESSION`, `CLEAR_JOB`

### 3. `extension/api.ts`
Four functions mirroring `frontend/src/api/backend-client.ts` guest endpoints:
- `createGuestTextSession(text)` → POST `/api/sessions/guest`
- `uploadGuestImage(imageUrl)` → fetch image blob, POST `/api/upload/guest` as FormData
- `getGuestSession(sessionId, accessToken)` → GET `/api/sessions/guest/{id}?access_token=...`
- `getGuestSessionEvents(sessionId, accessToken)` → GET `/api/sessions/guest/{id}/events?access_token=...`

API base URL: `https://api.dropcal.ai` (hardcoded for v1)

### 4. `extension/background.ts`
- **Context menu**: Register on `chrome.runtime.onInstalled` with `contexts: ['selection', 'image']`
- **Click handler**: On `chrome.contextMenus.onClicked`, create guest session, store `ActiveJob` in `chrome.storage.session`, start polling
- **Polling**: `setTimeout`-based loop (2s interval, 5min max). On completion, fetch events, update job, set badge, fire `chrome.notifications.create()`
- **Badge**: Blue `...` (processing), green count (success), red `!` (error)
- **Messages**: Handle `OPEN_SESSION` (open tab with deep link), `CLEAR_JOB` (clear storage + badge), `GET_STATUS`
- **Notification click**: Opens session in DropCal
- **Single active job**: New right-click overwrites previous job

### 5. `extension/popup/popup.html`
Four mutually exclusive states shown via `.hidden` class toggling:
- **Idle**: DropCal logo + instruction text ("Select text or right-click an image...")
- **Processing**: Spinner + "Processing..."
- **Success**: Green checkmark + "{N} Events Scheduled" + session title + "See in DropCal →" button + "Dismiss" button
- **Error**: Red icon + error message + "Dismiss" button

Width: 320px (CSS-controlled)

### 6. `extension/popup/popup.css`
Colors from `frontend/src/theme/lightTheme.ts`:
- Primary: `#1170C5`, hover: `#0D5A9E`
- Text: `#333333` / `#666666` / `#999999`
- Success: `#2e7d32` on `#e8f5e9`
- Error: `#c41e3a`
- Border: `#e5e5e5`
- System font stack matching the frontend

### 7. `extension/popup/popup.ts`
- On load: read `chrome.storage.session.get('activeJob')`, render appropriate state
- Listen to `chrome.storage.session.onChanged` for real-time updates while popup is open
- "See in DropCal →": send `OPEN_SESSION` message to background, close popup
- "Dismiss": send `CLEAR_JOB` message, render idle state

### 8. `extension/build.mjs`
esbuild script compiling `background.ts` → `dist/background.js` and `popup/popup.ts` → `dist/popup/popup.js`. Copies static files (manifest, HTML, CSS, icons) to `dist/`.

### 9. `extension/package.json`
Scripts: `build`, `watch`, `clean`. DevDeps: `esbuild`, `@types/chrome`, `typescript`.

### 10. `extension/tsconfig.json`
Target ES2022, module ES2022, types: `["chrome"]`.

## File to Modify

### `frontend/src/App.tsx`
Add ~8 lines to support `?token=` query param for extension deep-linking.

**Line 2** — add `useSearchParams` to the react-router-dom import.

**Inside `AppContent`** — add `useSearchParams` hook:

```typescript
const [searchParams, setSearchParams] = useSearchParams()
```

At the top of the session-load effect (before the `isGuestSession` check on line 183):
```typescript
const tokenParam = searchParams.get('token')
if (tokenParam && !GuestSessionManager.getSessionIds().includes(sessionId)) {
  GuestSessionManager.addGuestSession(sessionId, tokenParam)
  searchParams.delete('token')
  setSearchParams(searchParams, { replace: true })
}
```

This seeds the GuestSessionManager with the extension's access token so the existing session-load logic works unchanged.

## Icons

Generate from `brand/icon/circle/blue.png` using ImageMagick:
```bash
convert brand/icon/circle/blue.png -resize 16x16 extension/icons/icon16.png
convert brand/icon/circle/blue.png -resize 48x48 extension/icons/icon48.png
convert brand/icon/circle/blue.png -resize 128x128 extension/icons/icon128.png
```

Note: Chrome context menus do NOT support custom icons in MV3. The favicon appears in the toolbar, not the context menu.

## Key Technical Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Build tool | esbuild (no framework) | ~800 lines total, frameworks are overkill |
| Popup UI | Vanilla HTML/CSS/TS | No React — popup renders 1 card, doesn't justify 150KB |
| Auth | Guest mode only (v1) | No Supabase SDK complexity |
| Session monitoring | Polling (2s) | SSE requires JWT auth, guest sessions must poll |
| State storage | `chrome.storage.session` | Auto-clears on browser close, appropriate for transient tokens |
| CORS | Service worker + host_permissions | Bypasses CORS entirely, no backend changes needed |
| Deep linking | `?token=` query param in frontend | 8-line change vs content script injection |

## API Contracts

### Guest Text Session — `POST /api/sessions/guest`
```json
// Request
{ "input_type": "text", "input_content": "Meeting tomorrow at 2pm" }

// Response (201)
{
  "success": true,
  "session": {
    "id": "uuid",
    "status": "pending",
    "access_token": "64-char-hex",
    "guest_mode": true,
    "title": null,
    "event_ids": []
  }
}
```
Rate limit: 10/hour per IP. Text limit: 50,000 chars.

### Guest File Upload — `POST /api/upload/guest`
Multipart form data with `file` field. Image max: 20MB.
```json
// Response (201)
{
  "success": true,
  "session": { /* same shape */ },
  "file_url": "guest_uuid/path/to/file"
}
```

### Poll Guest Session — `GET /api/sessions/guest/{id}?access_token=...`
```json
// Response (200)
{
  "success": true,
  "session": {
    "id": "uuid",
    "status": "processing" | "processed" | "error",
    "title": "Meeting Notes",
    "event_ids": ["evt1", "evt2"],
    "error_message": null
  }
}
```

### Get Guest Events — `GET /api/sessions/guest/{id}/events?access_token=...`
```json
// Response (200)
{
  "events": [
    {
      "summary": "Team Meeting",
      "start": { "dateTime": "2026-02-20T14:00:00-05:00", "timeZone": "America/New_York" },
      "end": { "dateTime": "2026-02-20T15:00:00-05:00", "timeZone": "America/New_York" },
      "location": "Conference Room B"
    }
  ],
  "count": 1
}
```

## Verification

1. `cd extension && npm install && npm run build`
2. Open `chrome://extensions`, enable Developer Mode, "Load unpacked" → select `extension/dist/`
3. Navigate to any page, select text, right-click → "Send to DropCal" should appear
4. Click it → badge shows `...` → after processing, badge shows event count
5. Click extension icon → popup shows "{N} Events Scheduled"
6. Click "See in DropCal →" → opens dropcal.ai with the session loaded
7. Test image: right-click any image → "Send to DropCal" → same flow
8. Test error: disconnect internet → right-click → verify error state in popup

## Known Limitations (v1)

- **No auth**: Guest mode only (3 session limit per browser applies via dropcal.ai, not enforced in extension)
- **Service worker termination**: Chrome may kill the worker during long polls. Active `setTimeout` keeps it alive, but edge cases exist for 3+ minute processing times
- **Image fetch**: `info.srcUrl` images behind authentication will fail to fetch
- **No context menu icon**: MV3 doesn't support icons in context menu items
- **Single job**: Only tracks one active job at a time; new right-click overwrites previous