import React, { useMemo, useRef, useEffect } from 'react'
import './FlowPath.css'
import type { PathDescriptor } from './pathUtils'
import { resolvePath } from './pathUtils'

interface FlowPathProps {
    /** List of icon elements to rotate through */
    icons: React.ReactNode[];
    /** Size of each icon in pixels (width/height) */
    iconSize: number;
    /** Exact spacing/padding between icons in pixels */
    gap: number;
    /** SVG path string or array of {x,y} points (smooth spline) */
    path: PathDescriptor;
    /** Total length of the path in pixels. Auto-calculated if omitted. */
    pathLength?: number;
    /** Duration of one full loop in seconds */
    duration: number;
    /**
     * 0 = normal infinite loop.
     * > 0 = the entire stream is shifted forward along the path by `progress * exitDistance`.
     * At progress = 1 the stream is fully off the end of the path. Fully reversible: as
     * `progress` decreases, icons slide back into place. The loop itself never stops, so
     * when `progress` returns to 0 the loop continues seamlessly from wherever it advanced to.
     */
    progress?: number;
    /** How far past the path's end the stream is pushed at progress=1. ≥1 ensures full drain. */
    exitDistance?: number;
    /** Optional class name for the wrapper */
    className?: string;
}

export function FlowPath({
    icons,
    iconSize,
    gap,
    path,
    pathLength: pathLengthOverride,
    duration,
    progress = 0,
    exitDistance = 1.1,
    className = ''
}: FlowPathProps) {

    const resolved = useMemo(() => resolvePath(path), [path])
    const svgPath = resolved.path
    const pathLength = pathLengthOverride ?? resolved.length

    const stride = iconSize + gap
    const capacity = Math.max(0, Math.floor(pathLength / stride))

    const itemRefs = useRef<(HTMLDivElement | null)[]>([])

    /** Each icon's natural loop position in [0,1). Advances continuously, independent of `progress`. */
    const loopOffsetsRef = useRef<number[]>([])

    const progressRef = useRef(progress)
    progressRef.current = progress
    const exitDistanceRef = useRef(exitDistance)
    exitDistanceRef.current = exitDistance

    useEffect(() => {
        loopOffsetsRef.current = Array.from(
            { length: capacity },
            (_, i) => i / Math.max(1, capacity),
        )
    }, [capacity])

    useEffect(() => {
        let lastTime = performance.now()
        let rafId = 0

        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - lastTime) / 1000)
            lastTime = now
            const p = Math.max(0, progressRef.current)

            // Loop only advances at rest. Once a transition starts, the loop freezes —
            // icon motion is then driven entirely by `progress * exitDistance`. So if the
            // user stops scrolling mid-transition, the list stops too.
            const loopGate = Math.max(0, 1 - p * 50)
            const advance = (1 / duration) * dt * loopGate
            const loops = loopOffsetsRef.current
            for (let i = 0; i < loops.length; i++) {
                loops[i] += advance
                if (loops[i] >= 1) loops[i] -= 1
            }

            // Display offset = (frozen-during-transition) loop position + progress shift.
            const extra = p * exitDistanceRef.current
            for (let i = 0; i < loops.length; i++) {
                const el = itemRefs.current[i]
                if (!el) continue
                const display = loops[i] + extra
                if (display > 1) {
                    el.style.opacity = '0'
                } else {
                    el.style.opacity = ''
                    el.style.offsetDistance = `${display * 100}%`
                }
            }

            rafId = requestAnimationFrame(tick)
        }
        rafId = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafId)
    }, [capacity, duration])

    const displayItems = useMemo(() => {
        if (!icons.length || capacity <= 0) return []
        return Array.from({ length: capacity }, (_, i) => ({
            id: i,
            content: icons[i % icons.length],
            initialOffset: (i / capacity) * 100,
        }))
    }, [icons, capacity])

    return (
        <div className={`flow-path-container ${className}`}>
            {displayItems.map((item, i) => (
                <div
                    key={item.id}
                    ref={(el) => { itemRefs.current[i] = el }}
                    className="fp-item-wrapper"
                    style={{
                        width: `${iconSize}px`,
                        height: `${iconSize}px`,
                        offsetPath: `path('${svgPath}')`,
                        offsetDistance: `${item.initialOffset}%`,
                    } as React.CSSProperties}
                >
                    <div className="fp-item-content">
                        {item.content}
                    </div>
                </div>
            ))}
        </div>
    )
}
