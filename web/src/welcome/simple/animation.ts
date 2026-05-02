/**
 * Shared animation primitive for the Welcome shell.
 *
 * `useAnimatedPosition` smoothly tweens a numeric position toward a target.
 * It's used by both:
 *   - `PageDeck` (internal scroll list — target is the active deck index)
 *   - `Welcome` (shell-level deck↔auth switch — target is 0 or 1)
 *
 * Both transitions therefore share the same exit/enter timing curve.
 */

import { useEffect, useRef, useState } from 'react'

export type Easing = (t: number) => number

/** Fast start, smooth deceleration — the snappy modern page-transition curve. */
export const easeOutQuart: Easing = (t) => 1 - Math.pow(1 - t, 4)

export interface AnimatedPositionOptions {
  duration?: number
  ease?: Easing
  /** Starting visual position. Defaults to `target` (no entrance animation on mount). */
  initialPosition?: number
}

/**
 * Smoothly tweens a numeric position toward `target`. When `target` changes
 * mid-tween, a new tween starts from the current visual position.
 */
export function useAnimatedPosition(
  target: number,
  options: AnimatedPositionOptions = {},
): number {
  const { duration = 420, ease = easeOutQuart, initialPosition = target } = options

  const [, bump] = useState(0)
  const rerender = () => bump(n => (n + 1) | 0)

  const stateRef = useRef({
    position: initialPosition,
    target: initialPosition,
    animFrom: initialPosition,
    animStart: 0,
    rafId: 0,
  })

  useEffect(() => {
    const s = stateRef.current
    if (s.target === target) return

    // Restart from current visual position so a mid-tween target change is smooth.
    s.target = target
    s.animFrom = s.position
    s.animStart = performance.now()

    if (s.rafId) cancelAnimationFrame(s.rafId)

    const tick = (now: number) => {
      const cur = stateRef.current
      const t = Math.min(1, (now - cur.animStart) / duration)
      cur.position = cur.animFrom + (cur.target - cur.animFrom) * ease(t)
      rerender()
      if (t < 1) {
        cur.rafId = requestAnimationFrame(tick)
      } else {
        cur.rafId = 0
      }
    }
    s.rafId = requestAnimationFrame(tick)

    return () => {
      if (s.rafId) {
        cancelAnimationFrame(s.rafId)
        s.rafId = 0
      }
    }
  }, [target, duration, ease])

  return stateRef.current.position
}
