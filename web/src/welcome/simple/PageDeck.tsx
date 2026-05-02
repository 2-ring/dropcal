import {
    useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef,
    type ReactNode, type CSSProperties,
} from 'react'
import './PageDeck.css'

/**
 * A page is a render function that receives `progress`:
 *   progress = 0  → page is fully active
 *   progress = +1 → page has slid one slot "up" (next page is active)
 *   progress = -1 → page is one slot "below" (previous page is active)
 * Values are fractional during a transition animation (always eased).
 */
export type PageRender = (progress: number) => ReactNode

/** Optional per-page outer transform. Default is a vertical slide. */
export type PageTransform = (progress: number) => CSSProperties

export interface PageDeckHandle {
    goToPage: (index: number) => void
    readonly position: number
}

export interface PageDeckProps {
    pages: PageRender[]
    /** Per-page outer transform (default: vertical slide). */
    pageTransform?: PageTransform
    /** Transition duration in ms. */
    duration?: number
    /** Easing for every transition (manual or programmatic). */
    ease?: (t: number) => number
    /** Wheel deltaY needed to trigger a step. */
    wheelThreshold?: number
    /** Touch dy needed to trigger a step. */
    swipeThreshold?: number
    /** Notified continuously as the animated position changes. */
    onPositionChange?: (position: number) => void
    className?: string
}

const defaultPageTransform: PageTransform = (progress) => ({
    transform: `translate3d(0, ${-progress * 100}%, 0)`,
})

/** Fast start, smooth deceleration — the snappy modern page-transition curve. */
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)

export const PageDeck = forwardRef<PageDeckHandle, PageDeckProps>(function PageDeck(
    {
        pages,
        pageTransform = defaultPageTransform,
        duration = 420,
        ease = easeOutQuart,
        wheelThreshold = 30,
        swipeThreshold = 50,
        onPositionChange,
        className = '',
    },
    ref,
) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [, bump] = useState(0)
    const rerender = useCallback(() => bump(n => (n + 1) | 0), [])

    const stateRef = useRef({
        /** Animated, displayed position (float). */
        position: 0,
        /** Integer page we're transitioning toward. Equals `position` at rest. */
        target: 0,
        rafId: 0,
        animFrom: 0,
        animTo: 0,
        animStart: 0,
    })

    const notify = () => {
        onPositionChange?.(stateRef.current.position)
        rerender()
    }

    /** Start (or restart, if target changed) the tween from current `position` toward `target`. */
    const playToTarget = () => {
        const s = stateRef.current
        if (s.rafId) cancelAnimationFrame(s.rafId)
        s.animFrom = s.position
        s.animTo = s.target
        s.animStart = performance.now()

        const tick = (now: number) => {
            const cur = stateRef.current
            // If the target was bumped mid-tween, restart from the current visual position.
            if (cur.animTo !== cur.target) {
                cur.animFrom = cur.position
                cur.animTo = cur.target
                cur.animStart = now
            }
            const t = Math.min(1, (now - cur.animStart) / duration)
            cur.position = cur.animFrom + (cur.animTo - cur.animFrom) * ease(t)
            notify()
            if (t < 1 || cur.animTo !== cur.target) {
                cur.rafId = requestAnimationFrame(tick)
            } else {
                cur.rafId = 0
            }
        }
        s.rafId = requestAnimationFrame(tick)
    }

    /** Bump the target by ±1 (clamped) and play toward it. No-op at boundaries. */
    const step = (dir: 1 | -1) => {
        const s = stateRef.current
        const next = Math.max(0, Math.min(pages.length - 1, s.target + dir))
        if (next === s.target) return
        s.target = next
        playToTarget()
    }

    const goToPage = useCallback((idx: number) => {
        const s = stateRef.current
        const clamped = Math.max(0, Math.min(pages.length - 1, idx))
        if (clamped === s.target && s.position === clamped) return
        s.target = clamped
        playToTarget()
    }, [pages.length, duration, ease])

    useImperativeHandle(ref, () => ({
        goToPage,
        get position() { return stateRef.current.position },
    }), [goToPage])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        // Wheel: accumulate deltaY until past threshold, then step. Cooldown after each step
        // so a single trackpad gesture doesn't trigger multiple steps mid-flight.
        let wheelAccum = 0
        let wheelResetTimer: ReturnType<typeof setTimeout> | null = null
        let cooldownUntil = 0

        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            const now = performance.now()
            if (now < cooldownUntil) return

            wheelAccum += e.deltaY
            if (wheelResetTimer) clearTimeout(wheelResetTimer)
            wheelResetTimer = setTimeout(() => { wheelAccum = 0 }, 250)

            if (wheelAccum >= wheelThreshold) {
                step(1)
                wheelAccum = 0
                cooldownUntil = now + duration * 0.6
            } else if (wheelAccum <= -wheelThreshold) {
                step(-1)
                wheelAccum = 0
                cooldownUntil = now + duration * 0.6
            }
        }

        // Touch: total dy from start to end. One trigger per gesture.
        let touchStartY = 0
        const onTouchStart = (e: TouchEvent) => {
            touchStartY = e.touches[0].clientY
        }
        const onTouchEnd = (e: TouchEvent) => {
            const dy = touchStartY - e.changedTouches[0].clientY
            if (dy > swipeThreshold) step(1)
            else if (dy < -swipeThreshold) step(-1)
        }

        el.addEventListener('wheel', onWheel, { passive: false })
        el.addEventListener('touchstart', onTouchStart, { passive: true })
        el.addEventListener('touchend', onTouchEnd)
        el.addEventListener('touchcancel', onTouchEnd)

        return () => {
            el.removeEventListener('wheel', onWheel)
            el.removeEventListener('touchstart', onTouchStart)
            el.removeEventListener('touchend', onTouchEnd)
            el.removeEventListener('touchcancel', onTouchEnd)
            if (wheelResetTimer) clearTimeout(wheelResetTimer)
            if (stateRef.current.rafId) cancelAnimationFrame(stateRef.current.rafId)
        }
    }, [duration, ease, wheelThreshold, swipeThreshold, pages.length])

    const position = stateRef.current.position

    return (
        <div ref={containerRef} className={`page-deck ${className}`}>
            {pages.map((render, i) => {
                const progress = position - i
                if (Math.abs(progress) > 1.25) return null
                const style: CSSProperties = {
                    ...pageTransform(progress),
                    pointerEvents: Math.abs(progress) < 0.5 ? 'auto' : 'none',
                    zIndex: Math.abs(progress) < 0.5 ? 2 : 1,
                }
                return (
                    <div key={i} className="page-deck-page" style={style}>
                        {render(progress)}
                    </div>
                )
            })}
        </div>
    )
})
