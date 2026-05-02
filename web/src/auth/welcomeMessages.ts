/**
 * Short, presentational welcome messages for the auth page.
 * Picks one based on time of day and where the user came from
 * (?source= query param set by Welcome page CTAs).
 *
 * Mirrors the spirit of utils/greetings.ts but tuned for first-impressions
 * rather than the in-app greeting.
 */

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'lateNight';
export type AuthSource = 'beta' | 'login' | 'demo' | 'general';

interface Message {
  text: string;
  /** If set, message only shows during these times of day. */
  times?: TimeOfDay[];
  /** If set, message only shows when arriving from one of these sources. */
  sources?: AuthSource[];
}

const MESSAGES: Message[] = [
  // Generic — shown on any source/time
  { text: "Welcome" },
  { text: "Hey, come on in" },
  { text: "Glad you're here" },
  { text: "Step inside" },
  { text: "Make yourself at home" },
  { text: "Right this way" },
  { text: "You made it" },
  { text: "Let's begin" },
  { text: "Hello there" },
  { text: "Welcome aboard" },

  // Morning
  { text: "Good morning", times: ['morning'] },
  { text: "Bright and early", times: ['morning'] },
  { text: "Mornings, sorted", times: ['morning'] },
  { text: "Rise and plan", times: ['morning'] },
  { text: "Coffee's ready", times: ['morning'] },

  // Afternoon
  { text: "Good afternoon", times: ['afternoon'] },
  { text: "Afternoon arrival", times: ['afternoon'] },
  { text: "Midday welcome", times: ['afternoon'] },
  { text: "Right on time", times: ['afternoon'] },

  // Evening
  { text: "Good evening", times: ['evening'] },
  { text: "Evening, friend", times: ['evening'] },
  { text: "Winding down?", times: ['evening'] },

  // Late night
  { text: "Up late?", times: ['lateNight'] },
  { text: "Late-night drop-in", times: ['lateNight'] },
  { text: "Burning the midnight oil?", times: ['lateNight'] },
  { text: "Night owl, welcome", times: ['lateNight'] },

  // Beta — clicked "Join Beta"
  { text: "Welcome to the beta", sources: ['beta'] },
  { text: "Glad you're early", sources: ['beta'] },
  { text: "Welcome, beta tester", sources: ['beta'] },
  { text: "Early access starts here", sources: ['beta'] },
  { text: "Nice — you're in early", sources: ['beta'] },

  // Login — clicked "Log In"
  { text: "Welcome back", sources: ['login'] },
  { text: "Good to see you", sources: ['login'] },
  { text: "Hey, you're back", sources: ['login'] },
  { text: "Picking up where you left off", sources: ['login'] },

  // Demo — clicked "See how it works"
  { text: "Let's take a look", sources: ['demo'] },
  { text: "Quick tour starts here", sources: ['demo'] },
  { text: "Let's give it a try", sources: ['demo'] },
  { text: "Show and tell", sources: ['demo'] },
];

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'lateNight';
}

function normalizeSource(raw?: string | null): AuthSource {
  if (raw === 'beta' || raw === 'login' || raw === 'demo') return raw;
  return 'general';
}

// Cache so the heading doesn't churn across re-renders.
let cached: { text: string; key: string; timestamp: number } | null = null;
const CACHE_TTL_MS = 30_000;

export function getAuthWelcome(rawSource?: string | null): string {
  const time = getTimeOfDay();
  const source = normalizeSource(rawSource);
  const key = `${source}|${time}`;
  const now = Date.now();

  if (cached && cached.key === key && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.text;
  }

  const candidates = MESSAGES.filter(m => {
    if (m.sources && !m.sources.includes(source)) return false;
    if (m.times && !m.times.includes(time)) return false;
    return true;
  });

  const text = candidates[Math.floor(Math.random() * candidates.length)].text;
  cached = { text, key, timestamp: now };
  return text;
}
