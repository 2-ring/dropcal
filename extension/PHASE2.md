# Phase 2 — Enhanced Popup, Sidebar, and Page Capture

## Overview

Phase 2 upgrades the extension from a minimal context-menu-and-badge tool into a richer experience. The popup becomes a proper input surface (matching the DropCal app's drop area + button menu pattern), results show event title previews inline, and a sidebar provides full event card rendering with the same visual treatment as the web app.

Phase 1's context menu flow remains unchanged — Phase 2 adds to it.

## New Capabilities

1. **Enhanced popup** — drop zone + button menu + event title previews + "Capture Page"
2. **Sidebar** — full event cards grouped by date, reusing the web app's visual design
3. **Full page capture** — scrapes `document.body.innerText` from the active tab
4. **Multi-session history** — popup shows recent sessions, not just the latest
5. **Content script** — needed for page capture and paste interception

## Updated Architecture

```
extension/
├── manifest.json               # Updated: adds sidePanel, scripting permissions
├── background.ts               # Updated: page capture handler, sidebar open, session history
├── content.ts                  # NEW: injected for page text capture
├── api.ts                      # Unchanged from Phase 1
├── types.ts                    # Updated: SessionHistory, more message types
├── popup/
│   ├── popup.html              # Redesigned: drop area + button row + results list
│   ├── popup.css               # Redesigned: matches DropCal drop area / button menu
│   └── popup.ts                # Redesigned: drag-drop, paste, file input, results rendering
├── sidebar/
│   ├── sidebar.html            # NEW: shell for sidebar React-less event list
│   ├── sidebar.css             # NEW: event cards, date headers (ported from web app CSS)
│   └── sidebar.ts              # NEW: renders event cards, listens to storage changes
├── icons/                      # Unchanged
├── build.mjs                   # Updated: compile content.ts + sidebar
├── package.json
└── tsconfig.json
```

## Updated Manifest

New/changed fields vs Phase 1:

```json
{
  "permissions": [
    "contextMenus",
    "storage",
    "notifications",
    "activeTab",
    "sidePanel",          // NEW
    "scripting"           // NEW — for injecting content script on demand
  ],
  "side_panel": {
    "default_path": "sidebar/sidebar.html"
  },
  "content_scripts": []   // NOT declared statically — injected on-demand via scripting API
}
```

`activeTab` + `scripting` lets us inject `content.ts` only when the user clicks "Capture Page" — no scary "read all your data on all websites" install warning.

---

## Enhanced Popup

### Layout (380px wide)

```
┌──────────────────────────────────────┐
│  ┌──┐  DropCal                       │  ← Header: logo + wordmark
│  └──┘                                │
│                                      │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │                                │  │  ← Drop zone (dashed border,
│  │     Drop files, images,        │  │     rounded corners, primary-faint bg)
│  │      or text here              │  │     Accepts: drag-drop, click-to-browse,
│  │                                │  │     Ctrl+V paste
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                                      │
│    (🌐)    (📋)    (⬆)              │  ← Button row: Capture Page, Paste, center arrow
│                                      │     Circular icons matching mobile button menu
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                      │
│  Recent                              │  ← Results section header
│  ┌────────────────────────────────┐  │
│  │ ● Meeting Notes          3 →  │  │  ← Session row: title + event count + arrow
│  │   Team Meeting · 1:1 · ...    │  │     Subtitle: first 2-3 event titles joined
│  ├────────────────────────────────┤  │
│  │ ● Project Kickoff        1 →  │  │  ← Older session
│  │   Kickoff Meeting             │  │
│  └────────────────────────────────┘  │
│                                      │
│  Processing... ◌                     │  ← Active job indicator (if polling)
│                                      │
└──────────────────────────────────────┘
```

### Drop Zone

Adapted from `frontend/src/workspace/input/desktop/styles/desktop.css`:
- Dashed SVG border (9px stroke, `#1170C5`, 28/22 dash pattern, round linecap)
- `border-radius: 24px` (smaller than web's 64px — fits 380px popup)
- Background: `rgba(17, 112, 197, 0.08)` (primary-faint)
- Hover: background darkens to `rgba(17, 112, 197, 0.12)`, border fully opaque
- Dragging: background `rgba(17, 112, 197, 0.18)`, subtle `scale(1.02)`
- Min height: ~120px
- Center text: "Drop files, images, or text here" in `#666666`, 13px
- Subtext: "or click to browse" in `#999999`, 12px

**Interactions:**
- **Drag-and-drop files**: `ondragover`/`ondrop` on the zone. Accepts images, PDFs, text files, documents. Dropped file → `POST /api/upload/guest` via background service worker.
- **Click**: Opens native file picker (`<input type="file" hidden>` triggered by click). Same upload flow.
- **Ctrl+V paste**: Listen for `paste` event on the popup `document`. If clipboard has files (images), upload them. If clipboard has text, send as text session. Detected via `clipboardData.files` vs `clipboardData.getData('text/plain')`.

### Button Row

Inspired by the mobile `HomeScreen` circular button menu and desktop `DesktopButtonMenu`:

Three circular buttons (48x48) in a centered row with 16px gap:

| Button | Icon | Action |
|--------|------|--------|
| Capture Page | Globe (Phosphor `Globe`) | Injects content script → grabs `innerText` → creates text session |
| Paste | Clipboard (Phosphor `ClipboardText`) | Reads clipboard text → creates text session |
| Center arrow | ArrowUp (Phosphor `ArrowUp`) | Same as drop zone click — opens file picker |

**Button styling** (matching mobile/desktop pattern):
- 48x48 circle, `background: var(--background)`, `border: 1px solid #e5e5e5`
- `box-shadow: 0 2px 8px rgba(0,0,0,0.08)`
- Icon: 20px, `color: #333333`
- Hover: `background: #f5f5f5`, shadow deepens
- Active/pressed: `scale(0.95)` transform
- Disabled during processing: `opacity: 0.5`, `pointer-events: none`

### Results Section

Shows recent sessions from `chrome.storage.local` (persists across browser restarts, unlike Phase 1's `chrome.storage.session`).

**Session row** (one per recent session, max 5 stored):
- Left: colored dot (primary blue, or green if processed, red if error)
- Title: session title from API (bold, 14px, `#333333`), truncated with ellipsis
- Right: event count badge + `>` chevron
- Subtitle: first 2-3 event summaries joined with ` · `, truncated (12px, `#999999`)
- Click: opens sidebar with that session's events
- Long text wraps to max 2 lines then truncates

**Active processing indicator:**
- If a job is currently polling, show at the bottom: spinner + "Processing..." in `#666666`
- When it completes, the session row animates in at the top of the list

**Empty state:**
- No sessions yet: the results section is hidden, only the drop zone and buttons show
- Popup is more compact in this state

### Processing State (within popup)

When content is submitted (via drop, paste, capture, or button):
1. Drop zone text changes to "Processing..." with spinner
2. Drop zone border animates (dash-offset rotation via CSS animation)
3. Buttons become disabled (50% opacity)
4. Badge shows `...` (same as Phase 1)
5. When complete:
   - Drop zone returns to idle state
   - New session row appears at top of results list
   - Badge shows event count
   - OS notification fires (same as Phase 1)

---

## Full Page Capture

### Flow

1. User clicks "Capture Page" (globe button) in popup
2. Popup sends `CAPTURE_PAGE` message to background service worker
3. Service worker uses `chrome.scripting.executeScript()` to inject a function into the active tab:
   ```typescript
   chrome.scripting.executeScript({
     target: { tabId },
     func: () => ({
       text: document.body.innerText,
       title: document.title,
       url: document.URL,
     }),
   })
   ```
4. Service worker receives the result, prepends metadata:
   ```
   Page: {title}
   URL: {url}

   {innerText}
   ```
5. Sends as text session via `POST /api/sessions/guest`
6. Same polling + notification flow as Phase 1

### Why `scripting.executeScript` instead of a static content script

- `activeTab` permission grants temporary access to the active tab when the user clicks the extension icon (which opens the popup). This is a user gesture, so `executeScript` is allowed.
- No `<all_urls>` or `host_permissions` for arbitrary websites needed.
- No scary "Read and change all your data on all websites" install warning.
- The script runs once, grabs the text, and is done. No persistent injection.

### Text limit handling

- `document.body.innerText` on large pages can exceed 50,000 chars (the backend limit)
- Truncate to 50,000 chars with a note: `\n\n[Truncated — full page was {n} characters]`
- Or: consider sending only the first N paragraphs. For v2 this is fine as a simple truncation.

---

## Sidebar

### When it opens

- User clicks a session row in the popup → sidebar opens with that session's events
- User clicks "View in Sidebar" on a result notification → sidebar opens
- Sidebar can also be opened via `chrome.sidePanel.open()` from the background service worker

### Layout

```
┌──────────────────────────────────────────────┐
│  ← Back    Meeting Notes           DropCal   │  ← Header: back arrow + session title + logo
│──────────────────────────────────────────────│
│                                              │
│  February 2026                               │  ← Month header (like web app)
│                                              │
│  Thu 20                                      │  ← Date header
│  ┌──────────────────────────────────────┐    │
│  │▎ Team Meeting                        │    │  ← Event card (8px colored left border)
│  │▎ 2:00 PM - 3:00 PM                  │    │     Title + time range
│  │▎ 📍 Conference Room B               │    │     Location
│  │▎ Quarterly planning discussion       │    │     Description
│  └──────────────────────────────────────┘    │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │▎ 1:1 with Sarah                     │    │  ← Second event card
│  │▎ 3:30 PM - 4:00 PM                  │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  Fri 21                                      │  ← Next date
│  ┌──────────────────────────────────────┐    │
│  │▎ Project Kickoff                     │    │
│  │▎ All day                             │    │
│  │▎ 📍 Main Office                     │    │
│  └──────────────────────────────────────┘    │
│                                              │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │        Open in DropCal →             │    │  ← Primary CTA button (sticky bottom)
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

### Event Card Styling

Ported directly from `frontend/src/workspace/events/EventsWorkspace.css` and `Event.tsx`:

- `border-left: 8px solid {calendarColor}` (default `#1170C5` for extension since no calendar sync)
- `background: {calendarColor}12` (12% opacity tint)
- `border-radius: 16px`
- `padding: 12px 16px`

**Fields rendered per card:**
- **Title + time**: `{summary} ({timeRange})` — bold 14px, time in lighter weight
- **Location** (if present): MapPin icon (16px) + text — `#666666`, 13px
- **Description** (if present): Equals icon (16px) + text — `#666666`, 13px, max 2 lines truncated
- **Recurrence** (if present): ArrowsClockwise icon + formatted RRULE — `#666666`, 13px

No calendar badge (no calendar sync in guest mode), no sync status bar, no swipe actions. Read-only cards.

### Date Grouping

Same pattern as `EventsWorkspace.tsx`:
- **Month header**: Bold, 16px, `#333333` — "February 2026"
- **Date header**: Day-of-week abbreviated + date number — "Thu 20"
- Events grouped under their date, sorted chronologically

### Header

- **Back arrow** (left): closes sidebar (or goes back to session list if multi-session support)
- **Session title** (center): from `session.title`, 14px semibold, truncated
- **DropCal logo** (right): 24x24 icon

### Footer

- **"Open in DropCal →"** button: sticky at bottom, same `btn-primary` styling as Phase 1 popup
- Opens `https://dropcal.ai/s/{sessionId}?token={accessToken}` in new tab

### Loading State

If the sidebar opens while a session is still processing:
- Show skeleton cards (grey rectangles, 140px height, 16px border-radius, fading opacity)
- Cards appear one by one as events stream in from polling
- Skeleton count matches `expectedEventCount` if known, otherwise show 2-3

### Implementation Notes

- Sidebar is plain HTML/CSS/TS (same as popup — no React)
- Event cards are built with template literals in TypeScript, inserted via `innerHTML`
- Sidebar reads from `chrome.storage.local` (session history with events) and listens to `onChanged` for live updates
- The sidebar HTML is declared in the manifest as `side_panel.default_path`
- The service worker opens it via `chrome.sidePanel.open({ windowId })` when triggered from the popup

---

## Session History

Phase 2 tracks multiple sessions (Phase 1 only tracked the latest).

### Storage Schema

```typescript
// Stored in chrome.storage.local (persistent)
interface SessionHistory {
  sessions: SessionRecord[];  // Most recent first, max 10
}

interface SessionRecord {
  sessionId: string;
  accessToken: string;
  status: 'polling' | 'processed' | 'error';
  title: string | null;
  eventCount: number;
  eventSummaries: string[];   // First 3 event titles for popup subtitle
  events: CalendarEvent[];    // Full events for sidebar rendering
  errorMessage?: string;
  createdAt: number;          // Timestamp
  inputType: 'text' | 'image' | 'page' | 'file';
  pageUrl?: string;           // For page captures, the source URL
}
```

### Lifecycle

1. New session created → pushed to front of `sessions` array, status `polling`
2. Polling completes → record updated with `processed` status, event data populated
3. Error → record updated with `error` status and message
4. Older sessions (>10) are trimmed from the end of the array
5. Badge always reflects the most recent session's state

### Migration from Phase 1

Phase 1 stores `activeJob` in `chrome.storage.session`. Phase 2 migrates to `chrome.storage.local` with the `SessionHistory` schema. On first run after upgrade, check for `activeJob` in session storage, convert to `SessionRecord`, and move to local storage.

---

## New Message Types

Added to `types.ts`:

```typescript
export type ExtensionMessage =
  // Phase 1 (unchanged)
  | { type: 'GET_STATUS' }
  | { type: 'STATUS_UPDATE'; job: ActiveJob | null }
  | { type: 'OPEN_SESSION'; sessionId: string; accessToken: string }
  | { type: 'CLEAR_JOB' }
  // Phase 2 (new)
  | { type: 'CAPTURE_PAGE' }                              // Popup → Background: scrape active tab
  | { type: 'SUBMIT_TEXT'; text: string }                  // Popup → Background: text from paste/drop
  | { type: 'SUBMIT_FILE'; data: ArrayBuffer; name: string; mimeType: string }  // Popup → Background: file from drop/browse
  | { type: 'OPEN_SIDEBAR'; sessionId: string }            // Popup → Background: open sidebar for session
  | { type: 'GET_HISTORY' }                                // Popup/Sidebar → Background: get session list
  | { type: 'HISTORY_UPDATE'; sessions: SessionRecord[] }  // Background → Popup/Sidebar: history changed
```

---

## Updated Permissions Summary

| Permission | Phase 1 | Phase 2 | Why |
|------------|---------|---------|-----|
| `contextMenus` | Yes | Yes | Right-click menu |
| `storage` | Yes | Yes | Session/local storage |
| `notifications` | Yes | Yes | OS notifications |
| `activeTab` | Yes | Yes | Screenshot, page capture on user gesture |
| `sidePanel` | No | Yes | Event detail sidebar |
| `scripting` | No | Yes | Inject page capture script on demand |
| `host_permissions: api.dropcal.ai` | Yes | Yes | CORS-free API calls |

All new permissions (`sidePanel`, `scripting`) trigger **zero additional install warnings** when used with `activeTab`. The user sees the same permission dialog as Phase 1.

---

## CSS Design Tokens (Shared Across Popup + Sidebar)

Extracted from `frontend/src/theme/lightTheme.ts` and `frontend/src/workspace/input/desktop/styles/desktop.css`:

```css
:root {
  /* Brand */
  --primary: #1170C5;
  --primary-hover: #0D5A9E;
  --primary-faint: rgba(17, 112, 197, 0.08);
  --primary-faint-hover: rgba(17, 112, 197, 0.12);
  --primary-faint-drag: rgba(17, 112, 197, 0.18);

  /* Text */
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-tertiary: #999999;

  /* Status */
  --success: #2e7d32;
  --success-bg: #e8f5e9;
  --error: #c41e3a;
  --error-bg: rgba(196, 30, 58, 0.1);

  /* Surface */
  --background: #ffffff;
  --border: #e5e5e5;
  --surface-hover: #f5f5f5;

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);

  /* Radii */
  --radius-button: 50%;
  --radius-card: 16px;
  --radius-drop: 24px;
  --radius-pill: 8px;

  /* Sizing */
  --button-sm: 48px;
  --button-md: 56px;
  --icon-sm: 16px;
  --icon-md: 20px;
}
```

---

## Build Changes

`build.mjs` updated to compile two additional entry points:

```javascript
// Phase 2 additions
{ entryPoints: ['content.ts'], outfile: 'dist/content.js' }
{ entryPoints: ['sidebar/sidebar.ts'], outfile: 'dist/sidebar/sidebar.js' }
```

Copy step adds: `sidebar/sidebar.html`, `sidebar/sidebar.css` → `dist/sidebar/`

---

## Verification (Phase 2)

1. **Drop zone**: Open popup, drag a .txt file onto the drop area → should upload and start processing
2. **Paste**: Open popup, Ctrl+V text → should create text session
3. **File browse**: Click drop area or arrow button → file picker opens → select image → uploads
4. **Capture Page**: Click globe button → should scrape current tab's text → process
5. **Results list**: After processing, session appears in popup's "Recent" section with title + event count
6. **Sidebar**: Click a session row → sidebar opens with full event cards grouped by date
7. **Sidebar live updates**: Open sidebar while processing → skeleton cards appear → real cards replace them as events arrive
8. **Multi-session**: Process 3 different inputs → all 3 appear in popup results list
9. **Phase 1 still works**: Right-click selected text → context menu → process → badge + notification (unchanged)
