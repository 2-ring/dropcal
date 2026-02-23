// Unified side panel adapter.
// Chrome → chrome.sidePanel.
// Firefox → browser.sidebarAction.
// Safari → browser.sidebarAction (Safari supports it in MV3).

import { api, hasSidePanel, hasSidebarAction } from './detect';
import { storage } from './storage';

declare const browser: typeof chrome | undefined;

export interface PanelAdapter {
  open(options: { windowId?: number; sessionId?: string }): Promise<void>;
  isSupported: boolean;
}

function chromeSidePanel(): PanelAdapter {
  return {
    isSupported: true,
    async open({ windowId, sessionId }) {
      if (sessionId) {
        await new Promise<void>((resolve) => {
          storage.session.set({ sidebarSessionId: sessionId }, resolve);
        });
      }
      if (windowId) {
        await (api.sidePanel as any).open({ windowId });
      }
    },
  };
}

function firefoxSidebar(): PanelAdapter {
  return {
    isSupported: true,
    async open({ sessionId }) {
      // sidebarAction.open() MUST be called before any await — Firefox loses
      // the user-action context after an async gap (Bugzilla #1800401).
      await (browser as any).sidebarAction.open();
      if (sessionId) {
        storage.session.set({ sidebarSessionId: sessionId });
      }
    },
  };
}

export const panel: PanelAdapter = hasSidePanel
  ? chromeSidePanel()
  : firefoxSidebar();
