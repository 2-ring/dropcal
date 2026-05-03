// Unified side panel adapter.
// Chrome → chrome.sidePanel.
// Firefox → browser.sidebarAction.
// Safari → browser.sidebarAction (Safari supports it in MV3).

import { api, hasSidePanel, hasSidebarAction } from './detect';
import { storage } from './storage';

declare const browser: typeof chrome | undefined;

export interface PanelAdapter {
  open(options: { windowId?: number; sessionId?: string }): Promise<void>;
  /** Close/dismiss the panel from inside the panel page. */
  close(): void;
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
    close() {
      // Chrome's side panel page is a regular extension page; window.close()
      // closes it.
      window.close();
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
    close() {
      // window.close() is a no-op inside a Firefox sidebar_action panel.
      // sidebarAction.close() actually dismisses the sidebar.
      try {
        (browser as any).sidebarAction.close();
      } catch {
        // Older Firefox or unexpected context — fall back to window.close().
        window.close();
      }
    },
  };
}

export const panel: PanelAdapter = hasSidePanel
  ? chromeSidePanel()
  : firefoxSidebar();
