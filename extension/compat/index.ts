// Single entry point for all browser-compatibility abstractions.
// Every other file imports from here instead of using chrome.* directly.

export { api, hasSidebarAction } from './detect';
export * as features from './detect';
export { storage, clearSessionFallback } from './storage';
export { panel } from './panel';
export { action } from './action';
export { onPollTick, startPolling, stopPolling, stopAllPolling, isPolling } from './polling';
