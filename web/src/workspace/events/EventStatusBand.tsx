import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, CloudCheck, ArrowsClockwise, Warning, ArrowSquareOut, XCircle } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import type { CalendarEvent } from './types'
import { getEventSyncStatus } from './types'
import type { ConflictInfo } from '../../api/backend-client'

/**
 * Parent-controlled transient overrides — set by the workspace after a sync
 * action and cleared after a TTL. These take priority over the natural state
 * derived from event/sync data. The kind names the action so the band can
 * surface a context-specific label (e.g. "Save failed" vs "Sync failed").
 */
export type EventTransientStatus =
  | 'sync-failed'
  | 'save-failed'
  | 'delete-failed'
  | 'up-to-date'

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
 *
 * Animation: when the band first appears, the wrapper grows from 0 height,
 * and once fully grown the icon+message do a text-flip in. Subsequent state
 * changes flip the icon+message in place.
 */

export type EventStatusKind =
  | 'hidden'
  | 'created'
  | 'edit-applied'
  | 'synced'
  | 'up-to-date'
  | 'pending'
  | 'conflict'
  | 'failed'

export type EventStatusState =
  | { kind: 'hidden' }
  | { kind: 'created' }
  | { kind: 'edit-applied' }
  | { kind: 'synced' }
  | { kind: 'up-to-date' }
  | { kind: 'pending' }
  | { kind: 'conflict'; message: string }
  | { kind: 'failed'; label: string }

type VisibleStatusState = Exclude<EventStatusState, { kind: 'hidden' }>

interface StatusVisualConfig {
  label: string
  Icon: Icon
  className: string
}

// `conflict` and `failed` carry their own label inline; their `label` here is
// just a fallback that should never be shown.
const STATUS_CONFIG: Record<VisibleStatusState['kind'], StatusVisualConfig> = {
  created: { label: 'Created', Icon: CheckCircle, className: 'status-created' },
  'edit-applied': { label: 'Edit applied', Icon: CheckCircle, className: 'status-edit-applied' },
  synced: { label: 'Synced', Icon: CloudCheck, className: 'status-synced' },
  'up-to-date': { label: 'Up to date', Icon: CheckCircle, className: 'status-up-to-date' },
  pending: { label: 'Changes pending', Icon: ArrowsClockwise, className: 'status-apply-edits' },
  conflict: { label: '', Icon: Warning, className: 'status-conflict' },
  failed: { label: '', Icon: XCircle, className: 'status-failed' },
}

const TRANSIENT_FAILED_LABELS: Record<Exclude<EventTransientStatus, 'up-to-date'>, string> = {
  'sync-failed': 'Sync failed',
  'save-failed': 'Save failed',
  'delete-failed': 'Delete failed',
}

/** How long to flash the "Created" state before settling into "Synced". */
const CREATED_FLASH_MS = 3000

/** Animation timing knobs — kept here so the JSX stays declarative. */
const HEIGHT_DURATION = 0.25
const FLIP_DURATION = 0.25
const FLIP_EASE = [0.22, 1, 0.36, 1] as const

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
 * Extract the event's day parts in the user's local frame. All-day events
 * carry only a YYYY-MM-DD string, which we parse manually to avoid the
 * timezone shift `new Date('YYYY-MM-DD')` introduces (UTC midnight).
 */
function getEventDayParts(event: CalendarEvent): { y: number; m: number; d: number } | null {
  if (event.start.date) {
    const parts = event.start.date.split('-').map(Number)
    if (parts.length === 3 && parts.every(n => Number.isFinite(n))) {
      return { y: parts[0], m: parts[1], d: parts[2] }
    }
    return null
  }
  if (event.start.dateTime) {
    const dt = new Date(event.start.dateTime)
    if (Number.isNaN(dt.getTime())) return null
    return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }
  }
  return null
}

/**
 * Build a deep link to the user's calendar provider on the event's day.
 * Returns null when the provider has no usable web URL (e.g. Apple).
 */
export function getProviderDayUrl(
  provider: string | undefined,
  event: CalendarEvent,
): string | null {
  if (!provider) return null
  const parts = getEventDayParts(event)
  if (!parts) return null
  const { y, m, d } = parts

  switch (provider) {
    case 'google':
      return `https://calendar.google.com/calendar/u/0/r/day/${y}/${m}/${d}`
    case 'microsoft': {
      const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      return `https://outlook.office.com/calendar/view/day/${iso}`
    }
    default:
      return null
  }
}

/** Internal flash kind, derived from the prior sync state. */
type FlashKind = 'created' | 'edit-applied'

/**
 * Pure reducer: event + context → status state.
 *
 * Precedence (highest first):
 *   1. parent-controlled `transientStatus` (action-specific failure / up-to-date)
 *   2. internal post-sync flash (`Created` for new, `Edit applied` for re-sync)
 *   3. natural sync state (applied / edited / draft)
 *   4. conflict info (only when draft)
 */
export function deriveStatus(
  event: CalendarEvent,
  activeProvider: string | undefined,
  conflictInfo: ConflictInfo[] | undefined,
  formatTimeRange: (start: string, end: string) => string,
  flashKind: FlashKind | null,
  transientStatus: EventTransientStatus | null | undefined,
): EventStatusState {
  if (transientStatus && transientStatus !== 'up-to-date') {
    return { kind: 'failed', label: TRANSIENT_FAILED_LABELS[transientStatus] }
  }
  if (transientStatus === 'up-to-date') return { kind: 'up-to-date' }

  const syncStatus = getEventSyncStatus(event, activeProvider)

  if (syncStatus === 'applied') {
    if (flashKind === 'created') return { kind: 'created' }
    if (flashKind === 'edit-applied') return { kind: 'edit-applied' }
    return { kind: 'synced' }
  }
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
  transientStatus?: EventTransientStatus | null
}

export function EventStatusBand({
  event,
  activeProvider,
  conflictInfo,
  formatTimeRange,
  transientStatus,
}: EventStatusBandProps) {
  const syncStatus = getEventSyncStatus(event, activeProvider)
  const [flashKind, setFlashKind] = useState<FlashKind | null>(null)
  const prevSyncStatusRef = useRef(syncStatus)

  // Detect transitions into 'applied' during the component's lifetime. The
  // prior state determines the flash variant: draft→applied = a brand new
  // event ("Created"), edited→applied = a re-sync after a local edit
  // ("Edit applied"). If the event mounts already-applied (page reload), we
  // skip the flash and show the resting "Synced" state.
  useEffect(() => {
    const prev = prevSyncStatusRef.current
    if (prev === syncStatus) return
    prevSyncStatusRef.current = syncStatus

    if (syncStatus === 'applied') {
      setFlashKind(prev === 'edited' ? 'edit-applied' : 'created')
      const timer = setTimeout(() => setFlashKind(null), CREATED_FLASH_MS)
      return () => clearTimeout(timer)
    }

    setFlashKind(null)
  }, [syncStatus])

  const status = useMemo(
    () => deriveStatus(event, activeProvider, conflictInfo, formatTimeRange, flashKind, transientStatus),
    [event, activeProvider, conflictInfo, formatTimeRange, flashKind, transientStatus],
  )

  // The appear animation should only play on a real hidden→visible
  // transition, not on initial render with an already-visible status (page
  // load, scroll-into-view re-mount, etc.). We detect a "real" appearance by
  // checking whether the previous status was hidden.
  const prevStatusKindRef = useRef(status.kind)
  const skipAppearAnimation = prevStatusKindRef.current !== 'hidden'

  useEffect(() => {
    prevStatusKindRef.current = status.kind
  }, [status.kind])

  return (
    <AnimatePresence>
      {status.kind !== 'hidden' && (
        <StatusBandShell
          key="shell"
          status={status}
          event={event}
          activeProvider={activeProvider}
          skipAppearAnimation={skipAppearAnimation}
        />
      )}
    </AnimatePresence>
  )
}

/**
 * The shell handles the two-phase appear: first grow the wrapper to natural
 * height, then let the inner content text-flip in. Once `grown` is true,
 * subsequent state swaps flip in place via the inner AnimatePresence.
 */
function StatusBandShell({
  status,
  event,
  activeProvider,
  skipAppearAnimation,
}: {
  status: VisibleStatusState
  event: CalendarEvent
  activeProvider: string | undefined
  skipAppearAnimation: boolean
}) {
  // The very first inner-content flip waits for the wrapper to finish
  // growing. After that, status changes flip immediately. We track this
  // with a ref so that subsequent flips don't carry the appear-delay.
  const isFirstFlipRef = useRef(true)
  const flipDelay = isFirstFlipRef.current && !skipAppearAnimation ? HEIGHT_DURATION : 0

  useEffect(() => {
    isFirstFlipRef.current = false
  }, [])

  const visual = STATUS_CONFIG[status.kind]
  const label =
    status.kind === 'conflict' ? status.message
    : status.kind === 'failed' ? status.label
    : visual.label
  const StatusIcon = visual.Icon

  // Only the resting "Synced" state offers a deep-link to the provider.
  const providerUrl = status.kind === 'synced' ? getProviderDayUrl(activeProvider, event) : null

  return (
    <motion.div
      className="event-status-band-wrapper"
      initial={skipAppearAnimation ? false : { height: 0 }}
      animate={{ height: 'auto' }}
      exit={{ height: 0 }}
      transition={{ duration: HEIGHT_DURATION, ease: FLIP_EASE }}
    >
      <AnimatePresence mode="wait" initial={!skipAppearAnimation}>
        <motion.div
          key={status.kind}
          className={`event-status-bar ${visual.className}`}
          initial={{ y: 14, scale: 0.95, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: -14, scale: 0.95, opacity: 0 }}
          transition={{ duration: FLIP_DURATION, ease: FLIP_EASE, delay: flipDelay }}
        >
          <StatusIcon size={14} weight="bold" />
          <span>{label}</span>
          {providerUrl && (
            <a
              className="event-status-bar-link"
              href={providerUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="Open in calendar"
            >
              <ArrowSquareOut size={14} weight="bold" />
            </a>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
