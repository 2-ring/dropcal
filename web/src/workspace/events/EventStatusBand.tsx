import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle, CloudCheck, ArrowsClockwise, Warning } from '@phosphor-icons/react'
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
 *
 * Internal state: when an event transitions into the synced state during the
 * component's lifetime, we briefly flash the "Created" state before settling
 * into the resting "Synced" state.
 */

export type EventStatusKind = 'hidden' | 'created' | 'synced' | 'pending' | 'conflict'

export type EventStatusState =
  | { kind: 'hidden' }
  | { kind: 'created' }
  | { kind: 'synced' }
  | { kind: 'pending' }
  | { kind: 'conflict'; message: string }

interface StatusVisualConfig {
  label: string
  Icon: Icon
  className: string
}

const STATUS_CONFIG: Record<Exclude<EventStatusKind, 'hidden'>, StatusVisualConfig> = {
  created: { label: 'Created', Icon: CheckCircle, className: 'status-created' },
  synced: { label: 'Synced', Icon: CloudCheck, className: 'status-synced' },
  pending: { label: 'Changes pending', Icon: ArrowsClockwise, className: 'status-apply-edits' },
  conflict: { label: '', Icon: Warning, className: 'status-conflict' },
}

/** How long to flash the "Created" state before settling into "Synced". */
const CREATED_FLASH_MS = 3000

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
 * over conflict info (matches existing behavior). The `justCreated` flag is
 * the time-bounded "fresh sync" signal owned by the component.
 */
export function deriveStatus(
  event: CalendarEvent,
  activeProvider: string | undefined,
  conflictInfo: ConflictInfo[] | undefined,
  formatTimeRange: (start: string, end: string) => string,
  justCreated: boolean,
): EventStatusState {
  const syncStatus = getEventSyncStatus(event, activeProvider)

  if (syncStatus === 'applied') return { kind: justCreated ? 'created' : 'synced' }
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
  const syncStatus = getEventSyncStatus(event, activeProvider)
  const [justCreated, setJustCreated] = useState(false)
  const prevSyncStatusRef = useRef(syncStatus)

  // Detect transitions into 'applied' during the component's lifetime and
  // flash the 'created' state for CREATED_FLASH_MS. If the event mounts
  // already-applied (e.g. page reload), we skip the flash and show 'synced'.
  useEffect(() => {
    const prev = prevSyncStatusRef.current
    if (prev === syncStatus) return
    prevSyncStatusRef.current = syncStatus

    if (syncStatus === 'applied') {
      setJustCreated(true)
      const timer = setTimeout(() => setJustCreated(false), CREATED_FLASH_MS)
      return () => clearTimeout(timer)
    }

    setJustCreated(false)
  }, [syncStatus])

  const status = useMemo(
    () => deriveStatus(event, activeProvider, conflictInfo, formatTimeRange, justCreated),
    [event, activeProvider, conflictInfo, formatTimeRange, justCreated],
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
