import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, CloudCheck, ArrowsClockwise, Warning, ArrowSquareOut } from '@phosphor-icons/react'
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
 *
 * Animation: when the band first appears, the wrapper grows from 0 height,
 * and once fully grown the icon+message do a text-flip in. Subsequent state
 * changes flip the icon+message in place.
 */

export type EventStatusKind = 'hidden' | 'created' | 'synced' | 'pending' | 'conflict'

export type EventStatusState =
  | { kind: 'hidden' }
  | { kind: 'created' }
  | { kind: 'synced' }
  | { kind: 'pending' }
  | { kind: 'conflict'; message: string }

type VisibleStatusState = Exclude<EventStatusState, { kind: 'hidden' }>

interface StatusVisualConfig {
  label: string
  Icon: Icon
  className: string
}

const STATUS_CONFIG: Record<VisibleStatusState['kind'], StatusVisualConfig> = {
  created: { label: 'Created', Icon: CheckCircle, className: 'status-created' },
  synced: { label: 'Synced', Icon: CloudCheck, className: 'status-synced' },
  pending: { label: 'Changes pending', Icon: ArrowsClockwise, className: 'status-apply-edits' },
  conflict: { label: '', Icon: Warning, className: 'status-conflict' },
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
  const label = status.kind === 'conflict' ? status.message : visual.label
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
