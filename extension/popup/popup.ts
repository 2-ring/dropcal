interface ActiveJob {
  sessionId: string;
  status: 'polling' | 'processed' | 'error';
  eventCount: number;
  errorMessage?: string;
  sessionTitle?: string | null;
  createdAt: number;
}

const stateSignin = document.getElementById('state-signin')!;
const stateIdle = document.getElementById('state-idle')!;
const stateProcessing = document.getElementById('state-processing')!;
const stateSuccess = document.getElementById('state-success')!;
const stateError = document.getElementById('state-error')!;
const eventCountEl = document.getElementById('event-count')!;
const sessionTitleEl = document.getElementById('session-title')!;
const errorMessageEl = document.getElementById('error-message')!;
const btnSignin = document.getElementById('btn-signin')!;
const btnSigninError = document.getElementById('btn-signin-error')!;
const btnOpen = document.getElementById('btn-open')!;
const btnDismiss = document.getElementById('btn-dismiss')!;
const btnDismissError = document.getElementById('btn-dismiss-error')!;

function showState(state: 'signin' | 'idle' | 'processing' | 'success' | 'error'): void {
  stateSignin.classList.toggle('hidden', state !== 'signin');
  stateIdle.classList.toggle('hidden', state !== 'idle');
  stateProcessing.classList.toggle('hidden', state !== 'processing');
  stateSuccess.classList.toggle('hidden', state !== 'success');
  stateError.classList.toggle('hidden', state !== 'error');
}

function render(job: ActiveJob | null, isAuthenticated: boolean): void {
  if (!isAuthenticated) {
    showState('signin');
    return;
  }

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

    case 'error': {
      showState('error');
      const msg = job.errorMessage || 'Something went wrong.';
      errorMessageEl.textContent = msg;
      // Show sign-in button if this is an auth error
      const isAuthError = msg.includes('Sign in') || msg.includes('expired');
      btnSigninError.classList.toggle('hidden', !isAuthError);
      break;
    }
  }
}

// Sign in buttons
function handleSignIn(): void {
  chrome.runtime.sendMessage({ type: 'SIGN_IN' });
  window.close();
}
btnSignin.addEventListener('click', handleSignIn);
btnSigninError.addEventListener('click', handleSignIn);

// "See in DropCal" button
btnOpen.addEventListener('click', async () => {
  const result = await chrome.storage.session.get('activeJob');
  const activeJob = result.activeJob as ActiveJob | undefined;
  if (activeJob) {
    chrome.runtime.sendMessage({
      type: 'OPEN_SESSION',
      sessionId: activeJob.sessionId,
    });
    chrome.runtime.sendMessage({ type: 'CLEAR_JOB' });
    window.close();
  }
});

// Dismiss buttons
btnDismiss.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_JOB' });
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    render(null, response?.isAuthenticated ?? false);
  });
});

btnDismissError.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_JOB' });
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    render(null, response?.isAuthenticated ?? false);
  });
});

// Live updates while popup is open
chrome.storage.session.onChanged.addListener((changes) => {
  if (changes.activeJob) {
    // Re-check auth state when job changes
    chrome.runtime.sendMessage({ type: 'GET_AUTH' }, (response) => {
      render(
        (changes.activeJob.newValue as ActiveJob) || null,
        response?.isAuthenticated ?? false,
      );
    });
  }
});

// Also listen for auth changes (token arrives from content script)
chrome.storage.local.onChanged.addListener((changes) => {
  if (changes.auth) {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      render(response?.job || null, response?.isAuthenticated ?? false);
    });
  }
});

// Initial render
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
  render(response?.job || null, response?.isAuthenticated ?? false);
});
