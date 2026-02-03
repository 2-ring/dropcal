/**
 * SkeletonSessionItem Component
 *
 * Specialized skeleton for session list items in the Menu sidebar.
 * Matches the layout of session entries with icon, title, and optional badge.
 *
 * @example
 * <SkeletonSessionItem />
 *
 * @example
 * // With custom styles
 * <SkeletonSessionItem className="my-custom-class" />
 */

import Skeleton from 'react-loading-skeleton'
import './skeleton.css'

interface SkeletonSessionItemProps {
  /** Custom className */
  className?: string
  /** Whether to show event count badge */
  showBadge?: boolean
}

export function SkeletonSessionItem({
  className = '',
  showBadge = false
}: SkeletonSessionItemProps) {
  return (
    <div className={`skeleton-session-item ${className}`.trim()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px' }}>
        {/* Icon */}
        <Skeleton circle width={16} height={16} />

        {/* Title */}
        <div style={{ flex: 1 }}>
          <Skeleton height={16} width="80%" />
        </div>

        {/* Optional badge */}
        {showBadge && (
          <Skeleton width={20} height={18} borderRadius={9} />
        )}
      </div>
    </div>
  )
}

/**
 * SkeletonSessionGroup
 *
 * Skeleton for a group of session items with label
 */
interface SkeletonSessionGroupProps {
  /** Number of items in group */
  count?: number
  /** Whether to show group label */
  showLabel?: boolean
  /** Custom className */
  className?: string
}

export function SkeletonSessionGroup({
  count = 3,
  showLabel = true,
  className = ''
}: SkeletonSessionGroupProps) {
  return (
    <div className={`skeleton-session-group ${className}`.trim()}>
      {/* Group label */}
      {showLabel && (
        <div style={{ padding: '8px 12px' }}>
          <Skeleton width={60} height={12} />
        </div>
      )}

      {/* Session items */}
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonSessionItem key={index} showBadge={Math.random() > 0.5} />
      ))}
    </div>
  )
}
