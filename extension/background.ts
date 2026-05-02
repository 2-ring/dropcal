import type { ActiveJob, AuthState, ServerSession, SessionRecord, SessionHistory } from './types';
import {
  setAuthToken,
  createTextSession,
  uploadImage,
  getSession,
  getSessionEvents,
  getUserSessions,
  getUserPreferences,
  getUserProfile,
  updateUserPreferences,
  getCalendarProviders,
  setPrimaryCalendarProvider,
  disconnectCalendarProvider,
  pushEvents,
} from './api';
import {
  api,
  storage,
  clearSessionFallback,
  action,
  panel,
  onPollTick,
  startPolling,
  stopPolling,
  stopAllPolling,
} from './compat';

const MAX_POLL_DURATION_MS = 5 * 60 * 1000;
const MAX_HISTORY_SESSIONS = 50;
// Optimistic local-only entries (just submitted, not yet on server) are kept
// for this long before being dropped if they don't appear in a server refresh.
const OPTIMISTIC_GRACE_MS = 30_000;
// Mirrors the website's polling cadence while any session is in-progress.
const LIST_REFRESH_INTERVAL_MS = 3_000;
const CONTEXT_MENU_ID = 'send-to-dropcal';
const DROPCAL_URL = 'https://dropcal.ai';
const FEEDBACK_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Clear emulated session storage on startup (no-ops if real session storage exists)
clearSessionFallback();

// Recover any sessions stuck in 'polling' after a service worker restart.
// In-memory poll state (activePolls, rapidTimers) is lost on restart, so
// re-arm per-session polling for anything still in-progress AND pull the
// list from the server in case statuses changed while the SW was dead.
(async () => {
  const history = await getHistory();
  for (const session of history.sessions) {
    if (session.status === 'polling') {
      if (Date.now() - session.createdAt > MAX_POLL_DURATION_MS) {
        await updateSessionRecord(session.sessionId, {
          status: 'error',
          errorMessage: 'Processing timed out. Please try again.',
        });
        await pushNotification(session.sessionId);
      } else {
        startPolling(session.sessionId);
      }
    }
  }
  // Server may have processed sessions while SW was asleep — reconcile.
  refreshSessions();
})();

// Track poll start times for timeout detection. Declared up-front so
// wipeUserData can clear it during account switches.
const pollStartTimes = new Map<string, number>();

// ===== Auth State Management =====
//
// The website (dropcal.ai) is the source of truth. The content script reads
// Supabase's localStorage and pushes AUTH_TOKEN / AUTH_SIGNED_OUT messages.
// We identify the user by the JWT `sub` claim so token refreshes (same user,
// new accessToken) don't wipe history, while account switches (different user)
// do.

type AuthInput = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

// Decode the JWT payload (no signature verification — we trust localStorage
// of dropcal.ai, which is what the user already trusts to authenticate them).
function decodeJwtSub(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(atob(padded));
    return typeof json.sub === 'string' ? json.sub : null;
  } catch {
    return null;
  }
}

async function getAuth(): Promise<AuthState | null> {
  return new Promise((resolve) => {
    storage.local.get('auth', (result) => {
      resolve(result.auth || null);
    });
  });
}

// Wipe per-user state. Called on account switch and on website-driven sign-out.
// Does NOT remove the `auth` key itself — callers control that.
async function wipeUserData(): Promise<void> {
  stopAllPolling();
  pollStartTimes.clear();
  if (_listRefreshTimer !== null) {
    clearTimeout(_listRefreshTimer);
    _listRefreshTimer = null;
  }
  await new Promise<void>((resolve) => {
    storage.local.remove(
      ['sessionHistory', 'notificationQueue', 'themeMode', 'isLoadingSessions'],
      resolve,
    );
  });
  await new Promise<void>((resolve) => {
    storage.session.remove(['sidebarSessionId', 'activeJob'], resolve);
  });
  clearBadge();
}

async function setAuth(input: AuthInput): Promise<void> {
  const newUserId = decodeJwtSub(input.accessToken);
  const oldAuth = await getAuth();
  const oldUserId = oldAuth?.userId ?? null;

  // Account switch: only wipe when both ids are known and they differ. If
  // the old auth lacks a userId (legacy install pre-this-change), assume same
  // user — the next refresh will populate userId without wiping.
  const isUserSwitch =
    oldUserId !== null && newUserId !== null && oldUserId !== newUserId;

  if (isUserSwitch) {
    await wipeUserData();
  }

  const stored: AuthState = {
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    expiresAt: input.expiresAt,
    userId: newUserId,
  };

  await new Promise<void>((resolve) => {
    storage.local.set({ auth: stored }, resolve);
  });
  setAuthToken(input.accessToken);

  // Only fetch theme on identity change (sign-in or switch). Token refreshes
  // for the same user shouldn't trigger a redundant network call or theme flicker.
  const isNewIdentity = oldUserId === null || isUserSwitch;
  if (isNewIdentity) {
    fetchAndStoreTheme();
    // Pull the new user's session list from the server so the popup matches
    // the website immediately on sign-in.
    refreshSessions();
  }
}

async function fetchAndStoreTheme(): Promise<void> {
  try {
    const prefs = await getUserPreferences();
    const themeMode = prefs.theme_mode || 'auto';
    storage.local.set({ themeMode });
  } catch {
    // If preferences fetch fails (e.g. token expired), default to auto
  }
}

// Remove the stored auth. `wipe: true` also removes per-user data (history,
// notifications, theme) — used for explicit sign-out from the website or
// extension UI. `wipe: false` only clears the token — used when an API call
// returns 401, where the data may still be valid for the next sign-in.
async function clearAuth(opts: { wipe: boolean } = { wipe: true }): Promise<void> {
  if (opts.wipe) {
    await wipeUserData();
  }
  await new Promise<void>((resolve) => {
    storage.local.remove('auth', resolve);
  });
  setAuthToken(null);
}

async function ensureAuth(): Promise<boolean> {
  const auth = await getAuth();
  if (!auth) return false;

  // Token expired (with 60s buffer): report unauth but DON'T clear stored auth
  // or wipe data. The next AUTH_TOKEN message from the dropcal.ai content
  // script will reseed; if it's the same user, no data is lost.
  if (auth.expiresAt && Date.now() / 1000 > auth.expiresAt - 60) {
    setAuthToken(null);
    return false;
  }

  setAuthToken(auth.accessToken);
  return true;
}

// Capture the current userId, then call this after a network round-trip to
// confirm the user hasn't switched accounts mid-flight. If it returns false,
// the caller should abandon the operation rather than leak user A's session
// into user B's history.
async function authStillMatches(expectedUserId: string | null): Promise<boolean> {
  return ((await getAuth())?.userId ?? null) === expectedUserId;
}

// ===== Server-Backed Session List =====
//
// The server is the source of truth for the session list. Both the website
// and the extension call GET /sessions and render the same data. The local
// chrome.storage.local cache exists so the popup renders instantly on open
// (stale-while-revalidate) and so the sidebar can find a session's cached
// `events` array without a round-trip.

function mapInputType(t: ServerSession['input_type']): SessionRecord['inputType'] {
  // Extension's inputType enum is narrower; fold audio/email into 'file'/'text'.
  if (t === 'image') return 'image';
  if (t === 'audio') return 'file';
  if (t === 'email') return 'text';
  return 'text';
}

function mapServerStatus(s: ServerSession['status']): SessionRecord['status'] {
  if (s === 'processed') return 'processed';
  if (s === 'error') return 'error';
  return 'polling';
}

function mapServerToRecord(s: ServerSession, local?: SessionRecord): SessionRecord {
  const eventCount =
    s.event_ids?.length ?? s.processed_events?.length ?? s.extracted_events?.length ?? 0;
  return {
    sessionId: s.id,
    status: mapServerStatus(s.status),
    title: s.title || null,
    icon: s.icon || null,
    eventCount,
    addedToCalendar: !!s.added_to_calendar,
    // Preserve local-only enrichments — list endpoint doesn't return them.
    eventSummaries: local?.eventSummaries ?? [],
    events: local?.events ?? [],
    errorMessage: s.error_message || local?.errorMessage,
    dismissedAt: local?.dismissedAt,
    createdAt: new Date(s.created_at).getTime(),
    inputType: local?.inputType ?? mapInputType(s.input_type),
    pageUrl: local?.pageUrl,
  };
}

let _refreshInFlight: Promise<void> | null = null;
let _listRefreshTimer: ReturnType<typeof setTimeout> | null = null;

async function refreshSessions(): Promise<void> {
  // Coalesce concurrent calls — multiple popup opens or transition triggers
  // shouldn't fan out into parallel network calls.
  if (_refreshInFlight) return _refreshInFlight;

  _refreshInFlight = (async () => {
    if (!(await ensureAuth())) return;
    const expectedUserId = (await getAuth())?.userId ?? null;

    await new Promise<void>((resolve) => {
      storage.local.set({ isLoadingSessions: true }, resolve);
    });

    try {
      const serverSessions = await getUserSessions(MAX_HISTORY_SESSIONS);

      // User switched accounts during the request — drop these results so we
      // don't leak A's sessions into B's view.
      if (!(await authStillMatches(expectedUserId))) return;

      await serialized(async () => {
        const oldHistory = await getHistory();
        const oldById = new Map(oldHistory.sessions.map((s) => [s.sessionId, s]));
        const serverIds = new Set(serverSessions.map((s) => s.id));

        const merged: SessionRecord[] = serverSessions.map((s) =>
          mapServerToRecord(s, oldById.get(s.id)),
        );

        // Preserve recent optimistic adds that haven't propagated to the
        // server's list endpoint yet (just-submitted via context menu / popup).
        for (const local of oldHistory.sessions) {
          if (serverIds.has(local.sessionId)) continue;
          if (Date.now() - local.createdAt < OPTIMISTIC_GRACE_MS) {
            merged.push(local);
          }
        }

        merged.sort((a, b) => b.createdAt - a.createdAt);

        // Detect transitions for sessions the user submitted via this
        // extension. Only those should bump the badge / pop the popup —
        // surfacing a freshly-processed mobile session shouldn't notify.
        for (const next of merged) {
          const prev = oldById.get(next.sessionId);
          if (!prev) continue;
          if (prev.status === 'polling' && next.status !== 'polling') {
            await pushNotificationInternal(next.sessionId, merged);
            if (next.status === 'processed') action.tryOpenPopup();
          }
        }

        // For sessions that just transitioned to processed AND we don't have
        // events cached, fetch them so the sidebar can render without a
        // round-trip. Skip if there are too many to avoid burst calls.
        const needsEvents = merged.filter(
          (s) => s.status === 'processed' && s.events.length === 0 && s.eventCount > 0,
        );
        // Only auto-fetch for the most recent few; older ones can be lazy-loaded
        // when the sidebar opens.
        const toFetch = needsEvents.slice(0, 3);

        await new Promise<void>((resolve) => {
          storage.local.set(
            { sessionHistory: { sessions: merged.slice(0, MAX_HISTORY_SESSIONS) } },
            resolve,
          );
        });

        for (const s of toFetch) {
          getSessionEvents(s.sessionId)
            .then(({ events, count }) => {
              updateSessionRecord(s.sessionId, {
                events,
                eventCount: count,
                eventSummaries: events.slice(0, 3).map((e) => e.summary),
              });
            })
            .catch(() => {
              // Lazy-load fallback in sidebar handles failures.
            });
        }
      });

      ensureListRefreshLoop();
      syncBadge();
    } catch (err) {
      console.error('DropCal: refreshSessions failed', err);
    } finally {
      await new Promise<void>((resolve) => {
        storage.local.set({ isLoadingSessions: false }, resolve);
      });
    }
  })();

  try {
    await _refreshInFlight;
  } finally {
    _refreshInFlight = null;
  }
}

// Internal pushNotification variant that takes the merged list directly to
// avoid a redundant getHistory() inside the serialized block.
async function pushNotificationInternal(
  sessionId: string,
  history: SessionRecord[],
): Promise<void> {
  if (!history.some((s) => s.sessionId === sessionId)) return;
  const queue = await getNotificationQueue();
  if (!queue.includes(sessionId)) {
    queue.push(sessionId);
    await saveNotificationQueue(queue);
  }
}

// Schedule the next list-refresh tick if any session is still in-progress.
// Uses setTimeout for sub-minute cadence (alarms minimum is 1 minute).
// The existing per-session keepalive in compat/polling.ts keeps the SW alive
// while polling is active; for list-only refreshes we rely on the popup or
// content-script messages to wake the SW.
function ensureListRefreshLoop(): void {
  if (_listRefreshTimer !== null) return;

  const tick = async () => {
    _listRefreshTimer = null;
    const history = await getHistory();
    const stillProcessing = history.sessions.some((s) => s.status === 'polling');
    if (!stillProcessing) return;
    await refreshSessions();
  };

  _listRefreshTimer = setTimeout(tick, LIST_REFRESH_INTERVAL_MS);
}

// ===== Storage Serialization =====
// All read-modify-write operations on sessionHistory and notificationQueue
// are serialized through this queue to prevent concurrent overwrites when
// multiple sessions are processing simultaneously.

let _storageQueue: Promise<void> = Promise.resolve();

function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const op = _storageQueue.then(() => fn());
  _storageQueue = op.then(() => {}, () => {});
  return op;
}

// ===== Session History Management =====

async function getHistory(): Promise<SessionHistory> {
  return new Promise((resolve) => {
    storage.local.get('sessionHistory', (result) => {
      resolve(result.sessionHistory || { sessions: [] });
    });
  });
}

async function saveHistory(history: SessionHistory): Promise<void> {
  history.sessions = history.sessions.slice(0, MAX_HISTORY_SESSIONS);
  await new Promise<void>((resolve) => {
    storage.local.set({ sessionHistory: history }, resolve);
  });
  syncBadge();
}

function addSessionRecord(record: SessionRecord): Promise<void> {
  return serialized(async () => {
    const history = await getHistory();
    history.sessions = history.sessions.filter((s) => s.sessionId !== record.sessionId);
    history.sessions.unshift(record);
    await saveHistory(history);
  });
}

function updateSessionRecord(
  sessionId: string,
  updates: Partial<SessionRecord>,
): Promise<void> {
  return serialized(async () => {
    const history = await getHistory();
    const idx = history.sessions.findIndex((s) => s.sessionId === sessionId);
    if (idx !== -1) {
      history.sessions[idx] = { ...history.sessions[idx], ...updates };
      await saveHistory(history);
    }
  });
}

// ===== Notification Queue =====
// Tracks session IDs that need the user's attention (completion order).
// Serialized through the same queue as history to prevent interleaved writes.

async function getNotificationQueue(): Promise<string[]> {
  return new Promise((resolve) => {
    storage.local.get('notificationQueue', (result) => {
      resolve(result.notificationQueue || []);
    });
  });
}

async function saveNotificationQueue(queue: string[]): Promise<void> {
  await new Promise<void>((resolve) => {
    storage.local.set({ notificationQueue: queue }, resolve);
  });
  syncBadge();
}

function pushNotification(sessionId: string): Promise<void> {
  return serialized(async () => {
    // If the session was wiped (account switch / sign-out) while a poll was
    // in-flight, don't add an orphan queue entry that points at nothing.
    const history = await getHistory();
    if (!history.sessions.some((s) => s.sessionId === sessionId)) return;

    const queue = await getNotificationQueue();
    if (!queue.includes(sessionId)) {
      queue.push(sessionId);
      await saveNotificationQueue(queue);
    }
  });
}

function removeNotification(sessionId: string): Promise<void> {
  return serialized(async () => {
    const queue = await getNotificationQueue();
    await saveNotificationQueue(queue.filter((id) => id !== sessionId));
  });
}

// ===== Context Menu Setup =====

api.runtime.onInstalled.addListener(() => {
  api.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Send to DropCal',
    contexts: ['selection', 'image'],
  });

  // Migrate Phase 1 activeJob → sessionHistory if present
  migratePhase1Job();
});

async function migratePhase1Job(): Promise<void> {
  return new Promise((resolve) => {
    storage.session.get('activeJob', (result) => {
      const job = result.activeJob as ActiveJob | undefined;
      if (job && job.sessionId && job.status === 'processed') {
        const record: SessionRecord = {
          sessionId: job.sessionId,
          status: 'processed',
          title: job.sessionTitle || null,
          eventCount: job.eventCount,
          addedToCalendar: false,
          eventSummaries: (job.events || []).slice(0, 3).map((e) => e.summary),
          events: job.events || [],
          createdAt: job.createdAt,
          inputType: 'text',
        };
        addSessionRecord(record).then(() => {
          storage.session.remove('activeJob', () => resolve());
        });
      } else {
        resolve();
      }
    });
  });
}

// ===== Context Menu Click Handler =====

api.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;

  const hasAuth = await ensureAuth();
  if (!hasAuth) return;
  const expectedUserId = (await getAuth())?.userId ?? null;

  try {
    let session;
    let inputType: SessionRecord['inputType'] = 'text';

    if (info.selectionText) {
      setBadgeProcessing();
      session = await createTextSession(info.selectionText);
      inputType = 'text';
    } else if (info.srcUrl) {
      setBadgeProcessing();
      session = await uploadImage(info.srcUrl);
      inputType = 'image';
    } else {
      return;
    }

    // Account switched mid-request — the session was created under the old
    // user. Don't write it into the new user's history.
    if (!(await authStillMatches(expectedUserId))) {
      syncBadge();
      return;
    }

    const record: SessionRecord = {
      sessionId: session.id,
      status: 'polling',
      title: null,
      eventCount: 0,
      addedToCalendar: false,
      eventSummaries: [],
      events: [],
      createdAt: Date.now(),
      inputType,
    };
    await addSessionRecord(record);

    startPolling(session.id);
  } catch (error) {
    console.error('DropCal: Failed to create session', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const msgLower = msg.toLowerCase();
    const isAuthError =
      msgLower.includes('401') || msgLower.includes('403') ||
      msgLower.includes('authentication') || msgLower.includes('jwt') ||
      msgLower.includes('token') || msgLower.includes('expired');

    setBadgeError();
    setTimeout(() => syncBadge(), 5000);

    if (isAuthError) {
      // Drop the stored token so the UI shows sign-in, but keep history —
      // the user may re-authenticate as the same user and the data is still theirs.
      await clearAuth({ wipe: false });
    }
  }
});

// ===== Polling Logic =====

onPollTick(async (sessionId) => {
  if (!pollStartTimes.has(sessionId)) {
    pollStartTimes.set(sessionId, Date.now());
  }

  const startTime = pollStartTimes.get(sessionId)!;

  if (Date.now() - startTime > MAX_POLL_DURATION_MS) {
    stopPolling(sessionId);
    pollStartTimes.delete(sessionId);
    await updateSessionRecord(sessionId, {
      status: 'error',
      errorMessage: 'Processing timed out. Please try again.',
    });
    await pushNotification(sessionId);
    return;
  }

  try {
    const session = await getSession(sessionId);

    if (session.status === 'processed') {
      stopPolling(sessionId);
      pollStartTimes.delete(sessionId);

      const { events, count } = await getSessionEvents(sessionId);

      await updateSessionRecord(sessionId, {
        status: 'processed',
        title: session.title || null,
        icon: session.icon || null,
        eventCount: count,
        addedToCalendar: session.added_to_calendar,
        eventSummaries: events.slice(0, 3).map((e) => e.summary),
        events,
      });
      await pushNotification(sessionId);

      action.tryOpenPopup();
      return;
    }

    if (session.status === 'error') {
      stopPolling(sessionId);
      pollStartTimes.delete(sessionId);
      await updateSessionRecord(sessionId, {
        status: 'error',
        errorMessage: session.error_message || 'Processing failed',
      });
      await pushNotification(sessionId);
      return;
    }

    // Update title and icon mid-processing if available
    const midUpdates: Partial<SessionRecord> = {};
    if (session.title) midUpdates.title = session.title;
    if (session.icon) midUpdates.icon = session.icon;
    if (Object.keys(midUpdates).length > 0) {
      await updateSessionRecord(sessionId, midUpdates);
    }
  } catch (error) {
    console.error('DropCal: Poll error', error);
    // Don't stop — let the next tick retry
  }
});

// ===== Badge Helpers =====

let badgeSpinnerInterval: ReturnType<typeof setInterval> | null = null;

function setBadgeProcessing(): void {
  if (badgeSpinnerInterval !== null) return; // already spinning
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  action.setBadgeBackgroundColor({ color: '#1170C5' });
  action.setBadgeText({ text: frames[0] });
  badgeSpinnerInterval = setInterval(() => {
    i = (i + 1) % frames.length;
    action.setBadgeText({ text: frames[i] });
  }, 350);
}

function clearBadgeSpinner(): void {
  if (badgeSpinnerInterval !== null) {
    clearInterval(badgeSpinnerInterval);
    badgeSpinnerInterval = null;
  }
}

function setBadgeCount(count: number): void {
  clearBadgeSpinner();
  action.setBadgeText({ text: String(count) });
  action.setBadgeBackgroundColor({ color: '#2e7d32' });
}

function setBadgeError(): void {
  clearBadgeSpinner();
  action.setBadgeText({ text: '!' });
  action.setBadgeBackgroundColor({ color: '#c41e3a' });
}

function clearBadge(): void {
  clearBadgeSpinner();
  action.setBadgeText({ text: '' });
}

// Derives badge state from notification queue + session history.
async function syncBadge(): Promise<void> {
  const [history, queue] = await Promise.all([getHistory(), getNotificationQueue()]);
  const sessions = history.sessions;

  // Any session still polling → spinner
  if (sessions.some((s) => s.status === 'polling')) {
    setBadgeProcessing();
    return;
  }

  // Check pending notifications for errors and event counts
  let totalEvents = 0;
  let hasError = false;
  for (const id of queue) {
    const s = sessions.find((r) => r.sessionId === id);
    if (!s || s.dismissedAt || Date.now() - s.createdAt > FEEDBACK_EXPIRY_MS) continue;

    if (s.status === 'error' || (s.status === 'processed' && s.eventCount === 0)) {
      hasError = true;
    } else if (s.status === 'processed') {
      totalEvents += s.eventCount;
    }
  }

  if (hasError) {
    setBadgeError();
    return;
  }

  if (totalEvents > 0) {
    setBadgeCount(totalEvents);
    return;
  }

  // Default: clear
  clearBadge();
}

// ===== Message Handler =====

api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Content script sends auth token from dropcal.ai
  if (message.type === 'AUTH_TOKEN') {
    const { accessToken, refreshToken, expiresAt } = message;
    setAuth({ accessToken, refreshToken, expiresAt }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  // Content script sends theme mode changes from dropcal.ai
  if (message.type === 'THEME_CHANGED') {
    const themeMode = message.themeMode || 'auto';
    storage.local.set({ themeMode });
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'AUTH_SIGNED_OUT') {
    // Website-driven sign-out: wipe per-user data so the next sign-in starts clean.
    clearAuth({ wipe: true }).then(() => sendResponse({ ok: true }));
    return true;
  }

  // Popup queries — use ensureAuth so expired tokens count as unauthenticated
  // (popup will show sign-in; clicking sign-in opens dropcal.ai, which reseeds).
  if (message.type === 'GET_STATUS') {
    Promise.all([
      new Promise<Record<string, any>>((resolve) => {
        storage.session.get('activeJob', resolve);
      }),
      ensureAuth(),
    ]).then(([jobResult, isAuthenticated]) => {
      sendResponse({ job: jobResult.activeJob || null, isAuthenticated });
    });
    return true;
  }

  if (message.type === 'GET_AUTH') {
    ensureAuth().then((isAuthenticated) => {
      sendResponse({ isAuthenticated });
    });
    return true;
  }

  if (message.type === 'SIGN_IN') {
    const heading = encodeURIComponent('Sign in to start creating events.');
    api.tabs.create({ url: `${DROPCAL_URL}/auth?heading=${heading}` });
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'OPEN_SESSION') {
    const { sessionId } = message;
    const url = `${DROPCAL_URL}/app/s/${sessionId}`;
    api.tabs.create({ url });
    // Dismiss the notification for this session since the user is viewing it
    removeNotification(sessionId)
      .then(() => updateSessionRecord(sessionId, { dismissedAt: Date.now() }))
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === 'CLEAR_JOB') {
    storage.session.remove('activeJob');
    clearBadge();
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'SUBMIT_TEXT') {
    const { text } = message;
    ensureAuth().then(async (hasAuth) => {
      if (!hasAuth) {
        sendResponse({ ok: false, error: 'Not authenticated' });
        return;
      }
      const expectedUserId = (await getAuth())?.userId ?? null;
      try {
        setBadgeProcessing();
        const session = await createTextSession(text);

        // Account switched during the network call — abandon rather than
        // attribute this session to the new user.
        if (!(await authStillMatches(expectedUserId))) {
          syncBadge();
          sendResponse({ ok: false, error: 'User changed during request' });
          return;
        }

        const record: SessionRecord = {
          sessionId: session.id,
          status: 'polling',
          title: null,
          eventCount: 0,
          addedToCalendar: false,
          eventSummaries: [],
          events: [],
          createdAt: Date.now(),
          inputType: 'text',
        };
        await addSessionRecord(record);
        startPolling(session.id);
        sendResponse({ ok: true });
      } catch (error) {
        console.error('DropCal: Submit text failed', error);
        clearBadge();
        sendResponse({ ok: false });
      }
    });
    return true;
  }

  // Popup uploads files directly via fetch, then sends this to start polling.
  // The popup captures auth.userId before its upload and passes it through
  // here so we can drop the message if the user switched mid-upload.
  if (message.type === 'TRACK_SESSION') {
    const { sessionId, inputType, expectedUserId } = message;
    (async () => {
      if (
        expectedUserId !== undefined &&
        !(await authStillMatches(expectedUserId ?? null))
      ) {
        sendResponse({ ok: false, error: 'User changed during upload' });
        return;
      }
      setBadgeProcessing();
      const record: SessionRecord = {
        sessionId,
        status: 'polling',
        title: null,
        eventCount: 0,
        addedToCalendar: false,
        eventSummaries: [],
        events: [],
        createdAt: Date.now(),
        inputType: inputType || 'file',
      };
      await addSessionRecord(record);
      startPolling(sessionId);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === 'GET_HISTORY') {
    getHistory().then((history) => {
      sendResponse({ sessions: history.sessions });
    });
    return true;
  }

  // Popup triggers a refresh on open. Returns when the refresh completes so
  // the popup knows when the cache is up-to-date (it's already rendering
  // cached data in parallel via storage listeners).
  if (message.type === 'REFRESH_SESSIONS') {
    refreshSessions().then(() => sendResponse({ ok: true }));
    return true;
  }

  // Sidebar fallback: when a session was created elsewhere (mobile/website)
  // the extension may not have its events cached. Sidebar requests them.
  if (message.type === 'GET_SESSION_EVENTS') {
    const { sessionId } = message;
    ensureAuth().then(async (hasAuth) => {
      if (!hasAuth) {
        sendResponse({ ok: false, error: 'Not authenticated' });
        return;
      }
      try {
        const { events, count } = await getSessionEvents(sessionId);
        // Cache for next time
        await updateSessionRecord(sessionId, {
          events,
          eventCount: count,
          eventSummaries: events.slice(0, 3).map((e) => e.summary),
        });
        sendResponse({ ok: true, events });
      } catch (err) {
        console.error('DropCal: GET_SESSION_EVENTS failed', err);
        sendResponse({ ok: false, error: 'Failed to load events' });
      }
    });
    return true;
  }

  // Sidebar
  if (message.type === 'OPEN_SIDEBAR') {
    const { sessionId } = message;
    api.windows.getLastFocused().then((window) => {
      if (window.id) {
        panel.open({ windowId: window.id, sessionId }).catch(() => {});
      }
    });
    // Dismiss the notification since the user is viewing this session
    removeNotification(sessionId)
      .then(() => updateSessionRecord(sessionId, { dismissedAt: Date.now() }))
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  // Settings — get full user profile
  if (message.type === 'GET_USER_PROFILE') {
    ensureAuth().then(async (hasAuth) => {
      if (!hasAuth) {
        sendResponse({ ok: false, error: 'Not authenticated' });
        return;
      }
      try {
        const profile = await getUserProfile();
        sendResponse({ ok: true, profile });
      } catch (error) {
        console.error('DropCal: Failed to get profile', error);
        sendResponse({ ok: false, error: 'Failed to load profile' });
      }
    });
    return true;
  }

  // Settings — update preferences (theme_mode, date_format)
  if (message.type === 'UPDATE_PREFERENCES') {
    ensureAuth().then(async (hasAuth) => {
      if (!hasAuth) {
        sendResponse({ ok: false, error: 'Not authenticated' });
        return;
      }
      try {
        const result = await updateUserPreferences(message.preferences);
        // If theme_mode was updated, also update local storage for immediate theme change
        if (message.preferences.theme_mode) {
          storage.local.set({ themeMode: message.preferences.theme_mode });
        }
        sendResponse({ ok: true, preferences: result.preferences });
      } catch (error) {
        console.error('DropCal: Failed to update preferences', error);
        sendResponse({ ok: false, error: 'Failed to save preferences' });
      }
    });
    return true;
  }

  // Settings — get calendar providers
  if (message.type === 'GET_CALENDAR_PROVIDERS') {
    ensureAuth().then(async (hasAuth) => {
      if (!hasAuth) {
        sendResponse({ ok: false, error: 'Not authenticated' });
        return;
      }
      try {
        const result = await getCalendarProviders();
        sendResponse({ ok: true, providers: result.providers });
      } catch (error) {
        console.error('DropCal: Failed to get providers', error);
        sendResponse({ ok: false, error: 'Failed to load providers' });
      }
    });
    return true;
  }

  // Settings — set primary calendar provider
  if (message.type === 'SET_PRIMARY_PROVIDER') {
    ensureAuth().then(async (hasAuth) => {
      if (!hasAuth) {
        sendResponse({ ok: false, error: 'Not authenticated' });
        return;
      }
      try {
        await setPrimaryCalendarProvider(message.provider);
        sendResponse({ ok: true });
      } catch (error) {
        console.error('DropCal: Failed to set primary', error);
        sendResponse({ ok: false, error: 'Failed to set primary provider' });
      }
    });
    return true;
  }

  // Settings — disconnect calendar provider
  if (message.type === 'DISCONNECT_PROVIDER') {
    ensureAuth().then(async (hasAuth) => {
      if (!hasAuth) {
        sendResponse({ ok: false, error: 'Not authenticated' });
        return;
      }
      try {
        await disconnectCalendarProvider(message.provider);
        sendResponse({ ok: true });
      } catch (error) {
        console.error('DropCal: Failed to disconnect', error);
        sendResponse({ ok: false, error: 'Failed to disconnect provider' });
      }
    });
    return true;
  }

  // Popup — dismiss session feedback
  if (message.type === 'DISMISS_SESSION') {
    const { sessionId } = message;
    // Both ops are serialized through the storage queue — run sequentially
    removeNotification(sessionId)
      .then(() => updateSessionRecord(sessionId, { dismissedAt: Date.now() }))
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  // Sidebar — push all session events to calendar
  if (message.type === 'PUSH_ALL_EVENTS') {
    const { sessionId } = message;
    (async () => {
      const hasAuth = await ensureAuth();
      if (!hasAuth) return { ok: false, error: 'Not authenticated' };

      const history = await getHistory();
      const session = history.sessions.find((s) => s.sessionId === sessionId);
      const eventIds = (session?.events || [])
        .map((e) => e.id)
        .filter((id): id is string => !!id);

      if (eventIds.length === 0) return { ok: false, error: 'No events to add' };

      const result = await pushEvents(sessionId, eventIds);
      if (result.success) {
        await updateSessionRecord(sessionId, { addedToCalendar: true });
      }
      return { ok: result.success, message: result.message };
    })()
      .then((resp) => sendResponse(resp))
      .catch((error) => {
        console.error('DropCal: Push events failed', error);
        sendResponse({ ok: false, error: 'Failed to add events to calendar' });
      });
    return true;
  }

  // Settings — sign out (user-initiated). Mirrors the sign-in pattern: routes
  // through the website so the user is signed out everywhere. We clear the
  // extension auth immediately (so the popup updates) AND open dropcal.ai with
  // ?logout=1 so the website signs out too. If a dropcal.ai tab was already
  // open, the website's signOut() will fire AUTH_SIGNED_OUT — already a no-op
  // since extension auth is cleared.
  if (message.type === 'SIGN_OUT') {
    clearAuth({ wipe: true }).then(() => {
      api.tabs.create({ url: `${DROPCAL_URL}/?logout=1` });
      sendResponse({ ok: true });
    });
    return true;
  }

  return false;
});

