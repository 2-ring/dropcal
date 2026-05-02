import {
    useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef,
    type ReactNode, type CSSProperties,
} from 'react'
import { useAnimatedPosition, type Easing } from './animation'
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
    ease?: Easing
    /** Wheel deltaY needed to trigger a step. */
    wheelThreshold?: number
    /** Touch dy needed to trigger a step. */
    swipeThreshold?: number
    /** Outer-shell exit progress (0 = deck active, 1 = shell has fully exited the deck).
     *  When nonzero, the deck's active page receives an effective progress that
     *  reflects this so its own intrinsic exit animation plays during shell-level
     *  transitions (e.g. opening the auth panel). */
    outerProgress?: number
    /** Notified continuously as the animated position changes. */
    onPositionChange?: (position: number) => void
    className?: string
}

const defaultPageTransform: PageTransform = (progress) => ({
    transform: `translate3d(0, ${-progress * 100}%, 0)`,
})

export const PageDeck = forwardRef<PageDeckHandle, PageDeckProps>(function PageDeck(
    {
        pages,
        pageTransform = defaultPageTransform,
        duration = 420,
        ease,
        wheelThreshold = 30,
        swipeThreshold = 50,
        outerProgress = 0,
        onPositionChange,
        className = '',
    },
    ref,
) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [target, setTarget] = useState(0)
    const position = useAnimatedPosition(target, { duration, ease })

    useEffect(() => {
        onPositionChange?.(position)
    }, [position, onPositionChange])

    const step = useCallback((dir: 1 | -1) => {
        setTarget(t => Math.max(0, Math.min(pages.length - 1, t + dir)))
    }, [pages.length])

    const goToPage = useCallback((idx: number) => {
        setTarget(Math.max(0, Math.min(pages.length - 1, idx)))
    }, [pages.length])

    useImperativeHandle(ref, () => ({
        goToPage,
        get position() { return position },
    }), [goToPage, position])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

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
        }
    }, [duration, step, wheelThreshold, swipeThreshold])

    return (
        <div ref={containerRef} className={`page-deck ${className}`}>
            {pages.map((render, i) => {
                const innerProgress = position - i
                if (Math.abs(innerProgress) > 1.25) return null

                // Active page gets shell-level exit progress folded in so its
                // own intrinsic exit animation plays during shell transitions.
                const isActive = Math.abs(innerProgress) < 0.5
                const effectiveProgress = isActive
                    ? Math.sign(innerProgress || 1) * Math.max(Math.abs(innerProgress), outerProgress)
                    : innerProgress

                const style: CSSProperties = {
                    ...pageTransform(innerProgress),
                    pointerEvents: isActive && outerProgress < 0.5 ? 'auto' : 'none',
                    zIndex: isActive ? 2 : 1,
                }
                return (
                    <div key={i} className="page-deck-page" style={style}>
                        {render(effectiveProgress)}
                    </div>
                )
            })}
        </div>
    )
})
