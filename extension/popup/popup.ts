import type { SessionRecord } from '../types';
import { initTheme } from '../theme';

// ===== View State Machine =====
// 'processing' reuses the input view with the animated drop zone border.

type View = 'auth' | 'input' | 'processing' | 'feedback';

let currentView: View = 'auth';
const viewAuth = document.getElementById('view-auth')!;
const viewInput = document.getElementById('view-input')!;
const viewFeedback = document.getElementById('view-feedback')!;
const popupHeader = document.getElementById('popup-header')!;
const dropZone = document.getElementById('drop-zone')!;

const allViews = [viewAuth, viewInput, viewFeedback];

function showView(view: View): void {
  for (const v of allViews) v.classList.add('hidden');
  popupHeader.classList.toggle('hidden', view === 'auth');

  if (view === 'auth') {
    viewAuth.classList.remove('hidden');
  } else if (view === 'input') {
    viewInput.classList.remove('hidden');
    dropZone.classList.remove('processing');
  } else if (view === 'processing') {
    viewInput.classList.remove('hidden');
    dropZone.classList.add('processing');
  } else if (view === 'feedback') {
    viewFeedback.classList.remove('hidden');
    dropZone.classList.remove('processing');
  }

  currentView = view;
}

// ===== Header =====

const headerBrand = document.getElementById('header-brand')!;

headerBrand.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://dropcal.ai' });
});

// ============================================================
// View: Auth
// ============================================================

const btnSignin = document.getElementById('btn-signin')!;

btnSignin.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'SIGN_IN' });
  window.close();
});

// ============================================================
// View: Input
// ============================================================

// ----- DOM refs -----

const fileInput = document.getElementById('file-input') as HTMLInputElement;
const imageInput = document.getElementById('image-input') as HTMLInputElement;
const docInput = document.getElementById('doc-input') as HTMLInputElement;

const btnLink = document.getElementById('btn-link')!;
const btnImages = document.getElementById('btn-images')!;
const btnFiles = document.getElementById('btn-files')!;
const btnCenter = document.getElementById('btn-center')!;
const btnCapture = document.getElementById('btn-capture')!;
const btnPaste = document.getElementById('btn-paste')!;
const btnEmail = document.getElementById('btn-email')!;

const allButtons = [btnLink, btnImages, btnFiles, btnCenter, btnCapture, btnPaste, btnEmail];

const resultsSection = document.getElementById('results-section')!;
const resultsList = document.getElementById('results-list')!;

// ----- Button handlers -----

// Stop button clicks from bubbling to drop zone
for (const btn of allButtons) {
  btn.addEventListener('click', (e) => e.stopPropagation());
}

btnLink.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text && text.trim()) submitText(text.trim());
  } catch {
    // Clipboard access denied
  }
});

btnImages.addEventListener('click', () => imageInput.click());
btnFiles.addEventListener('click', () => docInput.click());
btnCenter.addEventListener('click', () => fileInput.click());

btnCapture.addEventListener('click', () => {
  showView('processing');
  chrome.runtime.sendMessage({ type: 'CAPTURE_PAGE' }, (response) => {
    if (response && !response.ok) {
      showFeedbackError(response.error || 'Capture failed');
    } else {
      window.close();
    }
  });
});

btnPaste.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text && text.trim()) submitText(text.trim());
  } catch {
    // Clipboard access denied
  }
});

btnEmail.addEventListener('click', () => {
  // TODO: email forwarding flow
});

// ----- File inputs -----

fileInput.addEventListener('change', () => {
  if (fileInput.files?.length) { handleFiles(fileInput.files); fileInput.value = ''; }
});

imageInput.addEventListener('change', () => {
  if (imageInput.files?.length) { handleFiles(imageInput.files); imageInput.value = ''; }
});

docInput.addEventListener('change', () => {
  if (docInput.files?.length) { handleFiles(docInput.files); docInput.value = ''; }
});

// ----- Drag & drop -----

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add('dragging');
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('dragging');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove('dragging');

  const dt = e.dataTransfer;
  if (!dt) return;

  if (dt.files && dt.files.length > 0) {
    handleFiles(dt.files);
    return;
  }

  const text = dt.getData('text/plain');
  if (text && text.trim()) submitText(text.trim());
});

// ----- Global paste -----

document.addEventListener('paste', (e) => {
  if (currentView !== 'input') return;
  const cd = e.clipboardData;
  if (!cd) return;

  if (cd.files && cd.files.length > 0) {
    handleFiles(cd.files);
    return;
  }

  const text = cd.getData('text/plain');
  if (text && text.trim()) submitText(text.trim());
});

// ----- History rendering -----

// Phosphor icon font class for backend icon names (kebab-case → ph-{name})
// Falls back to inputType-based Phosphor class
const INPUT_TYPE_ICON: Record<SessionRecord['inputType'], string> = {
  text: 'ph-pencil-simple',
  image: 'ph-images',
  page: 'ph-globe',
  file: 'ph-files',
};

function getIconClass(session: SessionRecord): string {
  if (session.icon) return `ph-${session.icon}`;
  return INPUT_TYPE_ICON[session.inputType] || INPUT_TYPE_ICON.text;
}

// Track titles we've already animated so we only animate once per session
const animatedTitles = new Set<string>();
// Track previous titles to detect when a title first appears
const prevTitles = new Map<string, string | null>();

function animateTitle(el: HTMLElement, text: string, speed = 25): void {
  let i = 0;
  el.textContent = '';
  el.classList.add('typing-cursor');
  const interval = setInterval(() => {
    if (i < text.length) {
      el.textContent = text.substring(0, ++i);
    } else {
      clearInterval(interval);
      el.classList.remove('typing-cursor');
    }
  }, speed);
}

function getTimeGroup(createdAt: number): string {
  const now = new Date();
  const daysDiff = Math.floor(
    (now.getTime() - createdAt) / (1000 * 60 * 60 * 24),
  );

  if (daysDiff === 0) return 'Today';
  if (daysDiff === 1) return 'Yesterday';
  if (daysDiff <= 7) return '7 Days';
  if (daysDiff <= 30) return '30 Days';
  return 'Older';
}

function filterSessions(sessions: SessionRecord[]): SessionRecord[] {
  return sessions.filter((session) => {
    if (session.status === 'error') return false;
    if (session.status === 'polling') return true;
    return session.eventCount > 0;
  });
}

function renderSkeletons(count = 5): void {
  resultsSection.classList.remove('hidden');
  resultsList.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const row = document.createElement('div');
    row.className = 'skeleton-row';
    row.innerHTML = '<div class="skeleton-icon"></div><div class="skeleton-title"></div>';
    resultsList.appendChild(row);
  }
}

function renderHistory(sessions: SessionRecord[]): void {
  const visible = filterSessions(sessions);

  if (visible.length === 0) {
    resultsSection.classList.add('hidden');
    return;
  }

  resultsSection.classList.remove('hidden');
  resultsList.innerHTML = '';

  // Group sessions by time period
  const groups = new Map<string, SessionRecord[]>();
  const groupOrder = ['Today', 'Yesterday', '7 Days', '30 Days', 'Older'];

  for (const session of visible) {
    const group = getTimeGroup(session.createdAt);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(session);
  }

  for (const groupName of groupOrder) {
    const groupSessions = groups.get(groupName);
    if (!groupSessions || groupSessions.length === 0) continue;

    const groupEl = document.createElement('div');
    groupEl.className = 'session-group';

    const label = document.createElement('div');
    label.className = 'session-group-label';
    label.textContent = groupName;
    groupEl.appendChild(label);

    for (const session of groupSessions) {
      const row = document.createElement('div');
      row.className = 'session-row';
      row.addEventListener('click', () => openSidebar(session.sessionId));

      // Icon: use Phosphor font class from backend icon or inputType fallback
      const icon = document.createElement('i');
      icon.className = `session-icon ph ${getIconClass(session)}`;

      // Title with skeleton / typing animation
      const title = document.createElement('div');
      title.className = 'session-row-title';

      if (session.status === 'polling' && !session.title) {
        // Skeleton title for processing sessions without a title yet
        title.innerHTML = '<div class="skeleton-title"></div>';
      } else if (session.title) {
        const prev = prevTitles.get(session.sessionId);
        const shouldAnimate = prev === null && !animatedTitles.has(session.sessionId);

        if (shouldAnimate) {
          animatedTitles.add(session.sessionId);
          animateTitle(title, session.title);
        } else {
          title.textContent = session.title;
        }
      } else {
        title.textContent = 'Untitled';
      }

      if (session.status === 'polling') title.classList.add('processing');

      row.appendChild(icon);
      row.appendChild(title);

      // Right indicator
      if (session.status === 'polling') {
        const pulse = document.createElement('div');
        pulse.className = 'processing-indicator';
        row.appendChild(pulse);
      } else if (session.eventCount > 0) {
        const badge = document.createElement('div');
        badge.className = 'event-count-badge';
        badge.textContent = String(session.eventCount);
        row.appendChild(badge);
      }

      groupEl.appendChild(row);
    }

    resultsList.appendChild(groupEl);
  }

  // Update previous titles for next render
  for (const session of sessions) {
    prevTitles.set(session.sessionId, session.title);
  }
}

// ============================================================
// View: Feedback
// ============================================================

const feedbackSuccess = document.getElementById('feedback-success')!;
const feedbackError = document.getElementById('feedback-error')!;
const feedbackTitle = document.getElementById('feedback-title')!;
const feedbackSubtitle = document.getElementById('feedback-subtitle')!;
const feedbackErrorText = document.getElementById('feedback-error-text')!;
const btnOpenSession = document.getElementById('btn-open-session')!;
const btnDismissSuccess = document.getElementById('btn-dismiss-success')!;
const btnDismissError = document.getElementById('btn-dismiss-error')!;

let feedbackSessionId: string | null = null;

function showFeedbackSuccess(session: SessionRecord): void {
  feedbackSessionId = session.sessionId;
  feedbackSuccess.classList.remove('hidden');
  feedbackError.classList.add('hidden');

  const count = session.eventCount;
  feedbackTitle.textContent = count === 1 ? '1 Event Scheduled' : `${count} Events Scheduled`;
  feedbackSubtitle.textContent = session.title || '';
  feedbackSubtitle.classList.toggle('hidden', !session.title);

  showView('feedback');
}

function showFeedbackError(message: string): void {
  feedbackSessionId = null;
  feedbackSuccess.classList.add('hidden');
  feedbackError.classList.remove('hidden');
  feedbackErrorText.textContent = message;

  showView('feedback');
}

btnOpenSession.addEventListener('click', () => {
  if (feedbackSessionId) openSidebar(feedbackSessionId);
});

btnDismissSuccess.addEventListener('click', () => {
  showView('input');
  loadHistory();
});

btnDismissError.addEventListener('click', () => {
  showView('input');
  loadHistory();
});

// ============================================================
// Shared Helpers
// ============================================================

function submitText(text: string): void {
  showView('processing');
  chrome.runtime.sendMessage({ type: 'SUBMIT_TEXT', text }, (response) => {
    if (response && !response.ok) {
      showFeedbackError(response.error || 'Failed to process text');
    } else {
      window.close();
    }
  });
}

function handleFiles(files: FileList): void {
  showView('processing');
  for (const file of Array.from(files)) {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const data = Array.from(new Uint8Array(arrayBuffer));
      chrome.runtime.sendMessage({
        type: 'SUBMIT_FILE',
        data,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
      }, (response) => {
        if (response && !response.ok) {
          showFeedbackError(response.error || 'Failed to upload file');
        } else {
          window.close();
        }
      });
    };
    reader.readAsArrayBuffer(file);
  }
}

async function openSidebar(sessionId: string): Promise<void> {
  await chrome.storage.session.set({ sidebarSessionId: sessionId });
  const win = await chrome.windows.getCurrent();
  if (win.id) {
    await (chrome.sidePanel as any).open({ windowId: win.id });
  }
}

// ============================================================
// Storage Listeners
// ============================================================

function onHistoryUpdate(sessions: SessionRecord[]): void {
  if (currentView === 'processing') {
    // Watch for the newest session to complete
    const newest = sessions[0];
    if (newest) {
      if (newest.status === 'processed') {
        showFeedbackSuccess(newest);
        return;
      }
      if (newest.status === 'error') {
        showFeedbackError(newest.errorMessage || 'Processing failed');
        return;
      }
    }
    // Still polling — stay in processing view
    renderHistory(sessions);
    return;
  }

  if (currentView === 'input') {
    renderHistory(sessions);
  }
}

chrome.storage.local.onChanged.addListener((changes) => {
  if (changes.sessionHistory) {
    const sessions =
      (changes.sessionHistory.newValue as { sessions: SessionRecord[] } | undefined)?.sessions || [];
    onHistoryUpdate(sessions);
  }
  if (changes.auth) {
    chrome.runtime.sendMessage({ type: 'GET_AUTH' }, (response) => {
      if (response?.isAuthenticated) {
        showView('input');
        loadHistory();
      } else {
        showView('auth');
      }
    });
  }
});

chrome.storage.session.onChanged.addListener(() => {
  loadHistory();
});

// ============================================================
// Init
// ============================================================

initTheme();

function loadHistory(): void {
  chrome.storage.local.get('sessionHistory', (result) => {
    const sessions =
      (result.sessionHistory as { sessions: SessionRecord[] } | undefined)?.sessions || [];
    onHistoryUpdate(sessions);
  });
}

chrome.runtime.sendMessage({ type: 'GET_AUTH' }, (response) => {
  const isAuth = response?.isAuthenticated ?? false;
  if (!isAuth) {
    showView('auth');
    return;
  }

  // Show skeleton while loading initial history
  showView('input');
  renderSkeletons();

  // Check if there's a polling session → reopen in processing view
  chrome.storage.local.get('sessionHistory', (result) => {
    const sessions =
      (result.sessionHistory as { sessions: SessionRecord[] } | undefined)?.sessions || [];

    // Seed prevTitles so existing titles don't animate on first load
    for (const s of sessions) {
      prevTitles.set(s.sessionId, s.title);
      if (s.title) animatedTitles.add(s.sessionId);
    }

    const newest = sessions[0];
    if (newest && newest.status === 'polling') {
      showView('processing');
    } else {
      showView('input');
    }
    onHistoryUpdate(sessions);
  });
});
