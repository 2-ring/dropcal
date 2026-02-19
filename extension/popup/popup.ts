import type { SessionRecord } from '../types';
import { initTheme } from '../theme';

// ===== DOM Elements =====

const stateSignin = document.getElementById('state-signin')!;
const stateMain = document.getElementById('state-main')!;
const btnSignin = document.getElementById('btn-signin')!;

const dropZone = document.getElementById('drop-zone')!;
const dropZoneIdle = document.getElementById('drop-zone-idle')!;
const dropZoneProcessing = document.getElementById('drop-zone-processing')!;
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
const activeProcessingEl = document.getElementById('active-processing')!;

let isProcessing = false;

// ===== Sidebar =====

async function openSidebar(sessionId: string): Promise<void> {
  // Store which session the sidebar should show
  await chrome.storage.session.set({ sidebarSessionId: sessionId });
  // Open sidebar from popup context (has user gesture + proper window)
  const window = await chrome.windows.getCurrent();
  if (window.id) {
    await (chrome.sidePanel as any).open({ windowId: window.id });
  }
}

// ===== Auth Check =====

function showSignedIn(show: boolean): void {
  stateSignin.classList.toggle('hidden', show);
  stateMain.classList.toggle('hidden', !show);
}

// ===== Processing State =====

function setProcessing(processing: boolean): void {
  isProcessing = processing;
  dropZone.classList.toggle('processing', processing);
  dropZoneIdle.classList.toggle('hidden', processing);
  dropZoneProcessing.classList.toggle('hidden', !processing);

  // Disable all buttons
  for (const btn of allButtons) {
    btn.classList.toggle('disabled', processing);
  }
}

// ===== Results Rendering =====

function renderHistory(sessions: SessionRecord[]): void {
  if (sessions.length === 0) {
    resultsSection.classList.add('hidden');
    activeProcessingEl.classList.add('hidden');
    return;
  }

  resultsSection.classList.remove('hidden');
  resultsList.innerHTML = '';

  // Check if any session is polling
  const hasPolling = sessions.some((s) => s.status === 'polling');

  // Show non-polling sessions in the results list
  const displaySessions = sessions.filter((s) => s.status !== 'polling');

  for (const session of displaySessions) {
    const row = document.createElement('div');
    row.className = 'session-row';
    row.addEventListener('click', () => {
      openSidebar(session.sessionId);
    });

    const dot = document.createElement('div');
    dot.className = `session-dot status-${session.status}`;

    const info = document.createElement('div');
    info.className = 'session-info';

    const title = document.createElement('div');
    title.className = 'session-row-title';
    title.textContent = session.title || 'Untitled';

    const subtitle = document.createElement('div');
    subtitle.className = 'session-row-subtitle';
    subtitle.textContent =
      session.eventSummaries.length > 0
        ? session.eventSummaries.slice(0, 3).join(' \u00B7 ')
        : session.status === 'error'
          ? session.errorMessage || 'Error'
          : '';

    info.appendChild(title);
    if (subtitle.textContent) {
      info.appendChild(subtitle);
    }

    const right = document.createElement('div');
    right.className = 'session-row-right';

    if (session.eventCount > 0) {
      const count = document.createElement('span');
      count.className = 'session-event-count';
      count.textContent = String(session.eventCount);
      right.appendChild(count);
    }

    const chevron = document.createElement('span');
    chevron.className = 'session-chevron';
    chevron.textContent = '\u203A'; // single right-pointing angle quotation mark
    right.appendChild(chevron);

    row.appendChild(dot);
    row.appendChild(info);
    row.appendChild(right);
    resultsList.appendChild(row);
  }

  // Show/hide active processing indicator
  if (hasPolling) {
    activeProcessingEl.classList.remove('hidden');
    setProcessing(true);
  } else {
    activeProcessingEl.classList.add('hidden');
    setProcessing(false);
  }

  // If no display sessions but we have polling, still show the section
  if (displaySessions.length === 0 && hasPolling) {
    resultsSection.classList.add('hidden');
  }
}

// ===== Sign In =====

btnSignin.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'SIGN_IN' });
  window.close();
});

// ===== File Input Handlers =====

fileInput.addEventListener('change', () => {
  if (!fileInput.files || fileInput.files.length === 0) return;
  handleFiles(fileInput.files);
  fileInput.value = '';
});

imageInput.addEventListener('change', () => {
  if (!imageInput.files || imageInput.files.length === 0) return;
  handleFiles(imageInput.files);
  imageInput.value = '';
});

docInput.addEventListener('change', () => {
  if (!docInput.files || docInput.files.length === 0) return;
  handleFiles(docInput.files);
  docInput.value = '';
});

// ===== Drop Zone — Drag & Drop =====

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!isProcessing) {
    dropZone.classList.add('dragging');
  }
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
  if (isProcessing) return;

  const dt = e.dataTransfer;
  if (!dt) return;

  // Check for files
  if (dt.files && dt.files.length > 0) {
    handleFiles(dt.files);
    return;
  }

  // Check for dropped text
  const text = dt.getData('text/plain');
  if (text && text.trim()) {
    chrome.runtime.sendMessage({ type: 'SUBMIT_TEXT', text: text.trim() });
    setProcessing(true);
  }
});

// ===== Paste (Ctrl+V anywhere in popup) =====

document.addEventListener('paste', (e) => {
  if (isProcessing) return;
  const clipboardData = e.clipboardData;
  if (!clipboardData) return;

  // Check for files (images)
  if (clipboardData.files && clipboardData.files.length > 0) {
    handleFiles(clipboardData.files);
    return;
  }

  // Check for text
  const text = clipboardData.getData('text/plain');
  if (text && text.trim()) {
    chrome.runtime.sendMessage({ type: 'SUBMIT_TEXT', text: text.trim() });
    setProcessing(true);
  }
});

// ===== Button Handlers =====

// Stop button clicks from bubbling to drop zone
for (const btn of allButtons) {
  btn.addEventListener('click', (e) => e.stopPropagation());
}

// Link — paste from clipboard (URL or text)
btnLink.addEventListener('click', async () => {
  if (isProcessing) return;
  try {
    const text = await navigator.clipboard.readText();
    if (text && text.trim()) {
      chrome.runtime.sendMessage({ type: 'SUBMIT_TEXT', text: text.trim() });
      setProcessing(true);
    }
  } catch {
    // Clipboard access denied
  }
});

// Images — open image file picker
btnImages.addEventListener('click', () => {
  if (isProcessing) return;
  imageInput.click();
});

// Files — open document file picker
btnFiles.addEventListener('click', () => {
  if (isProcessing) return;
  docInput.click();
});

// Center — open general file picker
btnCenter.addEventListener('click', () => {
  if (isProcessing) return;
  fileInput.click();
});

// Capture — capture current page
btnCapture.addEventListener('click', () => {
  if (isProcessing) return;
  setProcessing(true);
  chrome.runtime.sendMessage({ type: 'CAPTURE_PAGE' }, (response) => {
    if (response && !response.ok) {
      setProcessing(false);
    }
  });
});

// Paste — paste text from clipboard
btnPaste.addEventListener('click', async () => {
  if (isProcessing) return;
  try {
    const text = await navigator.clipboard.readText();
    if (text && text.trim()) {
      chrome.runtime.sendMessage({ type: 'SUBMIT_TEXT', text: text.trim() });
      setProcessing(true);
    }
  } catch {
    // Clipboard access denied
  }
});

// Email — placeholder (future: forward email)
btnEmail.addEventListener('click', () => {
  if (isProcessing) return;
  // TODO: email forwarding flow
});

// ===== File Handling =====

function handleFiles(files: FileList): void {
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
      });
      setProcessing(true);
    };
    reader.readAsArrayBuffer(file);
  }
}

// ===== Live Updates =====

chrome.storage.local.onChanged.addListener((changes) => {
  if (changes.sessionHistory) {
    const history = changes.sessionHistory.newValue as { sessions: SessionRecord[] } | undefined;
    renderHistory(history?.sessions || []);
  }
  if (changes.auth) {
    // Auth state changed — re-check
    chrome.runtime.sendMessage({ type: 'GET_AUTH' }, (response) => {
      showSignedIn(response?.isAuthenticated ?? false);
    });
  }
});

// Also listen to session storage for Phase 1 activeJob compatibility
chrome.storage.session.onChanged.addListener(() => {
  // Refresh history when activeJob changes (background syncs it)
  loadHistory();
});

// ===== Init =====

// Apply theme
initTheme();

function loadHistory(): void {
  chrome.storage.local.get('sessionHistory', (result) => {
    const history = result.sessionHistory as { sessions: SessionRecord[] } | undefined;
    renderHistory(history?.sessions || []);
  });
}

chrome.runtime.sendMessage({ type: 'GET_AUTH' }, (response) => {
  const isAuth = response?.isAuthenticated ?? false;
  showSignedIn(isAuth);
  if (isAuth) {
    loadHistory();
  }
});
