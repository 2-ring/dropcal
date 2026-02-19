// Content script that runs on dropcal.ai / www.dropcal.ai
// Reads the Supabase session from localStorage and sends it to the extension

const SUPABASE_STORAGE_KEY = 'sb-bdpiluwfhfmitvrcdrlr-auth-token';

let lastSentToken: string | null = null;

function readAndSendToken(): void {
  try {
    const raw = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (!raw) {
      if (lastSentToken !== null) {
        lastSentToken = null;
        chrome.runtime.sendMessage({ type: 'AUTH_SIGNED_OUT' }).catch(() => {});
      }
      return;
    }

    const session = JSON.parse(raw);
    const accessToken = session?.access_token;
    const refreshToken = session?.refresh_token;
    const expiresAt = session?.expires_at;

    if (accessToken && refreshToken && expiresAt) {
      // Only send if token changed (avoid spamming the background)
      if (accessToken !== lastSentToken) {
        lastSentToken = accessToken;
        chrome.runtime.sendMessage({
          type: 'AUTH_TOKEN',
          accessToken,
          refreshToken,
          expiresAt,
        }).catch(() => {});
      }
    } else if (lastSentToken !== null) {
      lastSentToken = null;
      chrome.runtime.sendMessage({ type: 'AUTH_SIGNED_OUT' }).catch(() => {});
    }
  } catch {
    // localStorage read or sendMessage failed — ignore
  }
}

// Send token on page load
readAndSendToken();

// Rapid polling for the first 15 seconds to catch post-OAuth token writes
// (Supabase processes the OAuth hash fragment async after page load)
let rapidPollCount = 0;
const rapidPoll = setInterval(() => {
  readAndSendToken();
  rapidPollCount++;
  if (rapidPollCount >= 15) {
    clearInterval(rapidPoll);
  }
}, 1000);

// Watch for cross-tab localStorage changes
window.addEventListener('storage', (event) => {
  if (event.key === SUPABASE_STORAGE_KEY) {
    readAndSendToken();
  }
});

// Steady-state poll every 5s to catch same-tab token refreshes
setInterval(readAndSendToken, 5000);
