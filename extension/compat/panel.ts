// Unified side panel adapter.
// Chrome → chrome.sidePanel (true side panel).
// Firefox → browser.sidebarAction (native sidebar), falls back to popup window.
// Safari → detached popup window.

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
      if (sessionId) {
        await new Promise<void>((resolve) => {
          storage.session.set({ sidebarSessionId: sessionId }, resolve);
        });
      }
      try {
        await (browser as any).sidebarAction.open();
      } catch {
        // Fall back to popup window if sidebarAction.open() fails
        const params = sessionId ? `?session=${sessionId}` : '';
        const url = api.runtime.getURL(`sidebar/sidebar.html${params}`);
        await api.windows.create({ url, type: 'popup', width: 380, height: 600 });
      }
    },
  };
}

function popupWindowFallback(): PanelAdapter {
  return {
    isSupported: true,
    async open({ sessionId }) {
      const params = sessionId ? `?session=${sessionId}` : '';
      const url = api.runtime.getURL(`sidebar/sidebar.html${params}`);
      await api.windows.create({ url, type: 'popup', width: 380, height: 600 });
    },
  };
}

export const panel: PanelAdapter = hasSidePanel
  ? chromeSidePanel()
  : hasSidebarAction
    ? firefoxSidebar()
    : popupWindowFallback();
