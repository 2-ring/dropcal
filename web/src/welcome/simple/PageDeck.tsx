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
 * Values can be fractional during a gesture and reverse mid-flight.
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
    /** Custom transform per page (default: vertical slide). */
    pageTransform?: PageTransform
    /** Pixels of wheel/touch travel needed to fully traverse one page. */
    transitionDistance?: number
    /** Fraction of a page (0–1) past which release commits forward. */
    commitThreshold?: number
    /** Snap-back / commit animation duration in ms. */
    snapDuration?: number
    /** Initial slope of the elastic curve at the boundary (higher = more responsive peek). */
    elasticity?: number
    /** Hard cap on overscroll past first/last page, as a fraction of a page (0 disables peek). */
    maxOverscroll?: number
    /** Easing fn used for snap/commit animations (t in [0,1] → eased [0,1]). */
    ease?: (t: number) => number
    /** Notified continuously as position changes. */
    onPositionChange?: (position: number) => void
    className?: string
}

const defaultPageTransform: PageTransform = (progress) => ({
    transform: `translate3d(0, ${-progress * 100}%, 0)`,
})

/** Strong ease in/out — slow start, fast middle, gentle settle. Feels like a satisfying slot. */
const easeInOutQuart = (t: number) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2

export const PageDeck = forwardRef<PageDeckHandle, PageDeckProps>(function PageDeck(
    {
        pages,
        pageTransform = defaultPageTransform,
        transitionDistance = 600,
        commitThreshold = 0.28,
        snapDuration = 520,
        elasticity = 0.4,
        maxOverscroll = 0.05,
        ease = easeInOutQuart,
        onPositionChange,
        className = '',
    },
    ref,
) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [, bump] = useState(0)
    const rerender = useCallback(() => bump(n => (n + 1) | 0), [])

    const stateRef = useRef({
        anchor: 0,           // settled page index
        offset: 0,           // signed displacement from anchor (in pages)
        phase: 'idle' as 'idle' | 'wheel' | 'touch' | 'animating',
        touchLastY: 0,
        wheelEndTimer: 0 as unknown as ReturnType<typeof setTimeout>,
        rafId: 0,
        animFrom: 0,
        animTo: 0,
        animStart: 0,
        animDur: 0,
    })

    const getPosition = () => stateRef.current.anchor + stateRef.current.offset
    const notify = () => {
        onPositionChange?.(getPosition())
        rerender()
    }

    const cancelAnim = () => {
        const s = stateRef.current
        if (s.rafId) {
            cancelAnimationFrame(s.rafId)
            s.rafId = 0
        }
    }

    const applyElastic = (raw: number) => {
        const s = stateRef.current
        const minOff = -s.anchor
        const maxOff = (pages.length - 1) - s.anchor
        if (raw >= minOff && raw <= maxOff) return raw
        if (maxOverscroll <= 0) return raw < minOff ? minOff : maxOff
        // tanh saturation: small inputs scale by `elasticity`, large inputs asymptote to `maxOverscroll`.
        const past = raw < minOff ? minOff - raw : raw - maxOff
        const damped = maxOverscroll * Math.tanh((past * elasticity) / maxOverscroll)
        return raw < minOff ? minOff - damped : maxOff + damped
    }

    const animateOffsetTo = (target: number, duration: number, onDone?: () => void) => {
        cancelAnim()
        const s = stateRef.current
        s.phase = 'animating'
        s.animFrom = s.offset
        s.animTo = target
        s.animStart = performance.now()
        s.animDur = Math.max(1, duration)

        const tick = (now: number) => {
            const t = Math.min(1, (now - s.animStart) / s.animDur)
            s.offset = s.animFrom + (s.animTo - s.animFrom) * ease(t)
            notify()
            if (t < 1) {
                s.rafId = requestAnimationFrame(tick)
            } else {
                s.rafId = 0
                s.phase = 'idle'
                onDone?.()
            }
        }
        s.rafId = requestAnimationFrame(tick)
    }

    const release = () => {
        const s = stateRef.current
        const off = s.offset
        // Too small → snap back to current page
        if (Math.abs(off) < commitThreshold) {
            animateOffsetTo(0, snapDuration)
            return
        }
        // Pick nearest integer step, but guarantee at least ±1 once past threshold.
        let step = Math.round(off)
        if (step === 0) step = off > 0 ? 1 : -1
        const newAnchor = Math.max(0, Math.min(pages.length - 1, s.anchor + step))
        const targetOffset = newAnchor - s.anchor
        animateOffsetTo(targetOffset, snapDuration, () => {
            s.anchor = newAnchor
            s.offset = 0
            notify()
        })
    }

    const goToPage = useCallback((target: number) => {
        const s = stateRef.current
        const clamped = Math.max(0, Math.min(pages.length - 1, target))
        if (clamped === s.anchor && s.offset === 0) return
        cancelAnim()
        const targetOffset = clamped - s.anchor
        const dur = snapDuration * Math.max(1, Math.abs(targetOffset) * 0.6)
        animateOffsetTo(targetOffset, dur, () => {
            s.anchor = clamped
            s.offset = 0
            notify()
        })
    }, [pages.length, snapDuration])

    useImperativeHandle(ref, () => ({
        goToPage,
        get position() { return getPosition() },
    }), [goToPage])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            const s = stateRef.current
            // If a snap animation was running, stop it and adopt current offset.
            if (s.phase === 'animating') cancelAnim()
            s.phase = 'wheel'
            s.offset = applyElastic(s.offset + e.deltaY / transitionDistance)
            notify()

            clearTimeout(s.wheelEndTimer)
            s.wheelEndTimer = setTimeout(() => {
                if (s.phase === 'wheel') release()
            }, 130)
        }

        const onTouchStart = (e: TouchEvent) => {
            const s = stateRef.current
            if (s.phase === 'animating') cancelAnim()
            s.phase = 'touch'
            s.touchLastY = e.touches[0].clientY
        }

        const onTouchMove = (e: TouchEvent) => {
            const s = stateRef.current
            if (s.phase !== 'touch') return
            e.preventDefault()
            const y = e.touches[0].clientY
            const dy = s.touchLastY - y
            s.touchLastY = y
            s.offset = applyElastic(s.offset + dy / transitionDistance)
            notify()
        }

        const onTouchEnd = () => {
            const s = stateRef.current
            if (s.phase !== 'touch') return
            release()
        }

        el.addEventListener('wheel', onWheel, { passive: false })
        el.addEventListener('touchstart', onTouchStart, { passive: true })
        el.addEventListener('touchmove', onTouchMove, { passive: false })
        el.addEventListener('touchend', onTouchEnd)
        el.addEventListener('touchcancel', onTouchEnd)

        return () => {
            el.removeEventListener('wheel', onWheel)
            el.removeEventListener('touchstart', onTouchStart)
            el.removeEventListener('touchmove', onTouchMove)
            el.removeEventListener('touchend', onTouchEnd)
            el.removeEventListener('touchcancel', onTouchEnd)
            clearTimeout(stateRef.current.wheelEndTimer)
            cancelAnim()
        }
    }, [transitionDistance, commitThreshold, snapDuration, elasticity, maxOverscroll, ease, pages.length])

    const position = getPosition()

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
