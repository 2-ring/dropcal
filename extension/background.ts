import type { ActiveJob } from './types';
import {
  createGuestTextSession,
  uploadGuestImage,
  getGuestSession,
  getGuestSessionEvents,
} from './api';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 5 * 60 * 1000;
const CONTEXT_MENU_ID = 'send-to-dropcal';
const DROPCAL_URL = 'https://dropcal.ai';

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

  try {
    let session;

    if (info.selectionText) {
      setBadgeProcessing();
      session = await createGuestTextSession(info.selectionText);
    } else if (info.srcUrl) {
      setBadgeProcessing();
      session = await uploadGuestImage(info.srcUrl);
    } else {
      return;
    }

    if (!session.access_token) {
      throw new Error('No access token returned from API');
    }

    const job: ActiveJob = {
      sessionId: session.id,
      accessToken: session.access_token,
      status: 'polling',
      eventCount: 0,
      createdAt: Date.now(),
    };
    await chrome.storage.session.set({ activeJob: job });

    pollSession(session.id, session.access_token);
  } catch (error) {
    console.error('DropCal: Failed to create session', error);
    const errorJob: ActiveJob = {
      sessionId: '',
      accessToken: '',
      status: 'error',
      eventCount: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      createdAt: Date.now(),
    };
    await chrome.storage.session.set({ activeJob: errorJob });
    setBadgeError();
  }
});

// ===== Polling Logic =====
async function pollSession(sessionId: string, accessToken: string): Promise<void> {
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
      const session = await getGuestSession(sessionId, accessToken);

      if (session.status === 'processed') {
        const { events, count } = await getGuestSessionEvents(sessionId, accessToken);

        const job: ActiveJob = {
          sessionId,
          accessToken,
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

        return;
      }

      if (session.status === 'error') {
        const job: ActiveJob = {
          sessionId,
          accessToken,
          status: 'error',
          eventCount: 0,
          errorMessage: session.error_message || 'Processing failed',
          createdAt: Date.now(),
        };
        await chrome.storage.session.set({ activeJob: job });
        setBadgeError();
        return;
      }

      // Still processing — poll again
      setTimeout(poll, POLL_INTERVAL_MS);
    } catch (error) {
      console.error('DropCal: Poll error', error);
      // Retry on network errors
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

// ===== Message Handler (popup <-> background) =====
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_STATUS') {
    getActiveJob().then((job) => sendResponse({ job }));
    return true; // async response
  }

  if (message.type === 'OPEN_SESSION') {
    const { sessionId, accessToken } = message;
    const url = `${DROPCAL_URL}/s/${sessionId}?token=${encodeURIComponent(accessToken)}`;
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
    const url = `${DROPCAL_URL}/s/${job.sessionId}?token=${encodeURIComponent(job.accessToken)}`;
    chrome.tabs.create({ url });
  }
});
