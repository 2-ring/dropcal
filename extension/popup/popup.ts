interface ActiveJob {
  sessionId: string;
  accessToken: string;
  status: 'polling' | 'processed' | 'error';
  eventCount: number;
  errorMessage?: string;
  sessionTitle?: string | null;
  createdAt: number;
}

const stateIdle = document.getElementById('state-idle')!;
const stateProcessing = document.getElementById('state-processing')!;
const stateSuccess = document.getElementById('state-success')!;
const stateError = document.getElementById('state-error')!;
const eventCountEl = document.getElementById('event-count')!;
const sessionTitleEl = document.getElementById('session-title')!;
const errorMessageEl = document.getElementById('error-message')!;
const btnOpen = document.getElementById('btn-open')!;
const btnDismiss = document.getElementById('btn-dismiss')!;
const btnDismissError = document.getElementById('btn-dismiss-error')!;

function showState(state: 'idle' | 'processing' | 'success' | 'error'): void {
  stateIdle.classList.toggle('hidden', state !== 'idle');
  stateProcessing.classList.toggle('hidden', state !== 'processing');
  stateSuccess.classList.toggle('hidden', state !== 'success');
  stateError.classList.toggle('hidden', state !== 'error');
}

function render(job: ActiveJob | null): void {
  if (!job) {
    showState('idle');
    return;
  }

  switch (job.status) {
    case 'polling':
      showState('processing');
      break;

    case 'processed':
      showState('success');
      eventCountEl.textContent =
        job.eventCount === 1
          ? '1 Event Scheduled'
          : `${job.eventCount} Events Scheduled`;
      if (job.sessionTitle) {
        sessionTitleEl.textContent = job.sessionTitle;
        sessionTitleEl.classList.remove('hidden');
      } else {
        sessionTitleEl.classList.add('hidden');
      }
      break;

    case 'error':
      showState('error');
      errorMessageEl.textContent = job.errorMessage || 'Something went wrong.';
      break;
  }
}

// "See in DropCal" button
btnOpen.addEventListener('click', async () => {
  const result = await chrome.storage.session.get('activeJob');
  const activeJob = result.activeJob as ActiveJob | undefined;
  if (activeJob) {
    chrome.runtime.sendMessage({
      type: 'OPEN_SESSION',
      sessionId: activeJob.sessionId,
      accessToken: activeJob.accessToken,
    });
    chrome.runtime.sendMessage({ type: 'CLEAR_JOB' });
    window.close();
  }
});

// Dismiss buttons
btnDismiss.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_JOB' });
  render(null);
});

btnDismissError.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_JOB' });
  render(null);
});

// Live updates while popup is open
chrome.storage.session.onChanged.addListener((changes) => {
  if (changes.activeJob) {
    render((changes.activeJob.newValue as ActiveJob) || null);
  }
});

// Initial render
chrome.storage.session.get('activeJob').then((result) => {
  render((result.activeJob as ActiveJob) || null);
});
