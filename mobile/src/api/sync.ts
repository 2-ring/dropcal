/**
 * Calendar sync client for DropCal Mobile.
 *
 * Creates a shared sync client with platform-specific config,
 * then re-exports all methods.
 */

import { createSyncClient, shouldSync } from '@dropcal/shared';
import type { SyncCalendar, SyncResult } from '@dropcal/shared';
import { getAccessToken } from '../auth/supabase';
import { API_URL } from './config';

const syncClient = createSyncClient({
  baseUrl: API_URL,
  getAccessToken,
});

export const { syncCalendar, getCalendars } = syncClient;
export { shouldSync };
export type { SyncCalendar, SyncResult };
