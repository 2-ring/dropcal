import type { ActiveJob, AuthState } from './types';
import {
  setAuthToken,
  createTextSession,
  uploadImage,
  getSession,
  getSessionEvents,
} from './api';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 5 * 60 * 1000;
const CONTEXT_MENU_ID = 'send-to-dropcal';
const DROPCAL_URL = 'https://dropcal.ai';

// ===== Auth State Management =====

async function getAuth(): Promise<AuthState | null> {
  const result = await chrome.storage.local.get('auth');
  return result.auth || null;
}

async function setAuth(auth: AuthState): Promise<void> {
  await chrome.storage.local.set({ auth });
  setAuthToken(auth.accessToken);
}

async function clearAuth(): Promise<void> {
  await chrome.storage.local.remove('auth');
  setAuthToken(null);
}

async function isAuthenticated(): Promise<boolean> {
  const auth = await getAuth();
  if (!auth) return false;
  // Token is considered valid if it expires more than 60 seconds from now
  return auth.expiresAt > Date.now() / 1000 + 60;
}

async function ensureAuth(): Promise<boolean> {
  const auth = await getAuth();
  if (!auth) return false;
  setAuthToken(auth.accessToken);
  // If token is expired, it might still work — the backend validates with Supabase
  // which may have refreshed it. Let the API call fail and handle 401 there.
  return true;
}

// ===== Context Menu Setup =====

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Send to DropCal',
    contexts: ['selection', 'image'],
  });
});

// ===== Context Menu Click Handler =====

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) return;

  const hasAuth = await ensureAuth();
  if (!hasAuth) {
    // Not signed in — set error state so popup shows sign-in prompt
    const errorJob: ActiveJob = {
      sessionId: '',
      status: 'error',
      eventCount: 0,
      errorMessage: 'Sign in to DropCal to use this feature.',
      createdAt: Date.now(),
    };
    await chrome.storage.session.set({ activeJob: errorJob });
    setBadgeError();
    return;
  }

  try {
    let session;

    if (info.selectionText) {
      setBadgeProcessing();
      session = await createTextSession(info.selectionText);
    } else if (info.srcUrl) {
      setBadgeProcessing();
      session = await uploadImage(info.srcUrl);
    } else {
      return;
    }

    const job: ActiveJob = {
      sessionId: session.id,
      status: 'polling',
      eventCount: 0,
      createdAt: Date.now(),
    };
    await chrome.storage.session.set({ activeJob: job });

    pollSession(session.id);
  } catch (error) {
    console.error('DropCal: Failed to create session', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';

    // If 401/403, prompt re-authentication
    const isAuthError = msg.includes('401') || msg.includes('403') || msg.includes('authentication');
    const errorJob: ActiveJob = {
      sessionId: '',
      status: 'error',
      eventCount: 0,
      errorMessage: isAuthError
        ? 'Session expired. Please sign in again on dropcal.ai.'
        : msg,
      createdAt: Date.now(),
    };
    await chrome.storage.session.set({ activeJob: errorJob });
    setBadgeError();

    if (isAuthError) {
      await clearAuth();
    }
  }
});

// ===== Polling Logic =====

async function pollSession(sessionId: string): Promise<void> {
  const startTime = Date.now();

  const poll = async () => {
    if (Date.now() - startTime > MAX_POLL_DURATION_MS) {
      const job = await getActiveJob();
      if (job && job.sessionId === sessionId) {
        job.status = 'error';
        job.errorMessage = 'Processing timed out. Please try again.';
        await chrome.storage.session.set({ activeJob: job });
        setBadgeError();
      }
      return;
    }

    try {
      const session = await getSession(sessionId);

      if (session.status === 'processed') {
        const { events, count } = await getSessionEvents(sessionId);

        const job: ActiveJob = {
          sessionId,
          status: 'processed',
          eventCount: count,
          sessionTitle: session.title,
          events,
          createdAt: Date.now(),
        };
        await chrome.storage.session.set({ activeJob: job });
        setBadgeCount(count);

        chrome.notifications.create(`dropcal-${sessionId}`, {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'DropCal',
          message:
            count === 1
              ? '1 event scheduled'
              : `${count} events scheduled`,
        });

        // Auto-open the popup to show the success state
        chrome.action.openPopup().catch(() => {});

        return;
      }

      if (session.status === 'error') {
        const job: ActiveJob = {
          sessionId,
          status: 'error',
          eventCount: 0,
          errorMessage: session.error_message || 'Processing failed',
          createdAt: Date.now(),
        };
        await chrome.storage.session.set({ activeJob: job });
        setBadgeError();
        return;
      }

      setTimeout(poll, POLL_INTERVAL_MS);
    } catch (error) {
      console.error('DropCal: Poll error', error);
      setTimeout(poll, POLL_INTERVAL_MS);
    }
  };

  poll();
}

// ===== Badge Helpers =====

function setBadgeProcessing(): void {
  chrome.action.setBadgeText({ text: '...' });
  chrome.action.setBadgeBackgroundColor({ color: '#1170C5' });
}

function setBadgeCount(count: number): void {
  chrome.action.setBadgeText({ text: String(count) });
  chrome.action.setBadgeBackgroundColor({ color: '#2e7d32' });
}

function setBadgeError(): void {
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#c41e3a' });
}

function clearBadge(): void {
  chrome.action.setBadgeText({ text: '' });
}

// ===== Storage Helpers =====

async function getActiveJob(): Promise<ActiveJob | null> {
  const result = await chrome.storage.session.get('activeJob');
  return result.activeJob || null;
}

// ===== Message Handler =====

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Content script sends auth token from dropcal.ai
  if (message.type === 'AUTH_TOKEN') {
    const { accessToken, refreshToken, expiresAt } = message;
    setAuth({ accessToken, refreshToken, expiresAt }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'AUTH_SIGNED_OUT') {
    clearAuth().then(() => sendResponse({ ok: true }));
    return true;
  }

  // Popup requests
  if (message.type === 'GET_STATUS') {
    Promise.all([getActiveJob(), getAuth()]).then(([job, auth]) => {
      sendResponse({ job, isAuthenticated: !!auth });
    });
    return true;
  }

  if (message.type === 'GET_AUTH') {
    getAuth().then((auth) => {
      sendResponse({ isAuthenticated: !!auth });
    });
    return true;
  }

  if (message.type === 'SIGN_IN') {
    chrome.tabs.create({ url: DROPCAL_URL });
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'OPEN_SESSION') {
    const { sessionId } = message;
    const url = `${DROPCAL_URL}/s/${sessionId}`;
    chrome.tabs.create({ url });
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'CLEAR_JOB') {
    chrome.storage.session.remove('activeJob');
    clearBadge();
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

// ===== Notification Click =====

chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (!notificationId.startsWith('dropcal-')) return;
  const job = await getActiveJob();
  if (job && job.status === 'processed') {
    const url = `${DROPCAL_URL}/s/${job.sessionId}`;
    chrome.tabs.create({ url });
  }
});
