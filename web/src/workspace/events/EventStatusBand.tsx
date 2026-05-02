import { useMemo } from 'react'
import { CheckCircle, ArrowsClockwise, Warning } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import type { CalendarEvent } from './types'
import { getEventSyncStatus } from './types'
import type { ConflictInfo } from '../../api/backend-client'

/**
 * The status band shown at the bottom of an event card.
 *
 * Owns its own state machine: given an event + its sync/conflict context, it
 * derives a single `EventStatusState` and renders the appropriate band. To add
 * a new status (e.g. "syncing", "error"), extend `EventStatusKind`, add an
 * entry to `STATUS_CONFIG`, and add a branch to `deriveStatus`.
 */

export type EventStatusKind = 'hidden' | 'created' | 'pending' | 'conflict'

export type EventStatusState =
  | { kind: 'hidden' }
  | { kind: 'created' }
  | { kind: 'pending' }
  | { kind: 'conflict'; message: string }

interface StatusVisualConfig {
  label: string
  Icon: Icon
  className: string
}

const STATUS_CONFIG: Record<Exclude<EventStatusKind, 'hidden'>, StatusVisualConfig> = {
  created: { label: 'Created', Icon: CheckCircle, className: 'status-created' },
  pending: { label: 'Changes pending', Icon: ArrowsClockwise, className: 'status-apply-edits' },
  conflict: { label: '', Icon: Warning, className: 'status-conflict' },
}

function buildConflictMessage(
  conflictInfo: ConflictInfo[],
  formatTimeRange: (start: string, end: string) => string,
): string {
  if (conflictInfo.length === 1) {
    const c = conflictInfo[0]
    return `Conflict with ${c.summary} (${formatTimeRange(c.start_time, c.end_time)})`
  }
  return 'Conflict with multiple events'
}

/**
 * Pure reducer: event + context → status state. Sync status takes priority
 * over conflict info (matches existing behavior).
 */
export function deriveStatus(
  event: CalendarEvent,
  activeProvider: string | undefined,
  conflictInfo: ConflictInfo[] | undefined,
  formatTimeRange: (start: string, end: string) => string,
): EventStatusState {
  const syncStatus = getEventSyncStatus(event, activeProvider)

  if (syncStatus === 'applied') return { kind: 'created' }
  if (syncStatus === 'edited') return { kind: 'pending' }

  if (conflictInfo && conflictInfo.length > 0) {
    return { kind: 'conflict', message: buildConflictMessage(conflictInfo, formatTimeRange) }
  }

  return { kind: 'hidden' }
}

interface EventStatusBandProps {
  event: CalendarEvent
  activeProvider?: string
  conflictInfo?: ConflictInfo[]
  formatTimeRange: (start: string, end: string) => string
}

export function EventStatusBand({
  event,
  activeProvider,
  conflictInfo,
  formatTimeRange,
}: EventStatusBandProps) {
  const status = useMemo(
    () => deriveStatus(event, activeProvider, conflictInfo, formatTimeRange),
    [event, activeProvider, conflictInfo, formatTimeRange],
  )

  if (status.kind === 'hidden') return null

  const visual = STATUS_CONFIG[status.kind]
  const label = status.kind === 'conflict' ? status.message : visual.label
  const { Icon: StatusIcon, className } = visual

  return (
    <div className={`event-status-bar ${className}`}>
      <StatusIcon size={14} weight="bold" />
      <span>{label}</span>
    </div>
  )
}
