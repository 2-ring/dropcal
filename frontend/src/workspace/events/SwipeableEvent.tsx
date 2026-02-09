import { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { CalendarStar, X } from '@phosphor-icons/react'
import type { CalendarEvent } from './types'

const SWIPE_THRESHOLD = 100

interface SwipeableEventProps {
  children: React.ReactNode
  event: CalendarEvent
  onSwipeRight?: (event: CalendarEvent) => void
  onSwipeLeft?: (event: CalendarEvent) => void
}

export function SwipeableEvent({ children, event, onSwipeRight, onSwipeLeft }: SwipeableEventProps) {
  const x = useMotionValue(0)
  const [swiping, setSwiping] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Action panel opacity based on drag distance
  const addOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])
  const removeOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])

  // Scale for the action icons
  const addScale = useTransform(x, [0, SWIPE_THRESHOLD * 0.5, SWIPE_THRESHOLD], [0.5, 0.8, 1])
  const removeScale = useTransform(x, [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.5, 0], [1, 0.8, 0.5])

  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeDistance = info.offset.x
    const velocity = info.velocity.x

    // Use velocity + distance to determine if swipe is intentional
    const swipedRight = swipeDistance > SWIPE_THRESHOLD || (swipeDistance > 50 && velocity > 500)
    const swipedLeft = swipeDistance < -SWIPE_THRESHOLD || (swipeDistance < -50 && velocity < -500)

    if (swipedRight && onSwipeRight) {
      // Animate out to the right, then trigger callback
      animate(x, 400, { duration: 0.2 }).then(() => {
        onSwipeRight(event)
        // Reset position after action
        x.set(0)
      })
    } else if (swipedLeft && onSwipeLeft) {
      // Animate out to the left, then trigger callback
      animate(x, -400, { duration: 0.2 }).then(() => {
        onSwipeLeft(event)
        // Reset position after action
        x.set(0)
      })
    } else {
      // Snap back
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 })
    }

    setSwiping(false)
  }

  return (
    <div ref={containerRef} className="swipeable-event-container">
      {/* Action panels behind the card */}
      <motion.div className="swipe-action swipe-action-add" style={{ opacity: addOpacity }}>
        <motion.div className="swipe-action-content" style={{ scale: addScale }}>
          <CalendarStar size={24} weight="duotone" />
          <span>Add</span>
        </motion.div>
      </motion.div>

      <motion.div className="swipe-action swipe-action-remove" style={{ opacity: removeOpacity }}>
        <motion.div className="swipe-action-content" style={{ scale: removeScale }}>
          <X size={24} weight="bold" />
          <span>Remove</span>
        </motion.div>
      </motion.div>

      {/* Draggable card */}
      <motion.div
        className="swipeable-event-card"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        dragElastic={0.1}
        onDragStart={() => setSwiping(true)}
        onDragEnd={handleDragEnd}
        whileDrag={{ cursor: 'grabbing' }}
      >
        {/* Prevent click events during swipe */}
        <div
          style={{ pointerEvents: swiping ? 'none' : 'auto' }}
          onClickCapture={(e) => {
            // If we just finished swiping, prevent the click
            if (Math.abs(x.get()) > 5) {
              e.stopPropagation()
              e.preventDefault()
            }
          }}
        >
          {children}
        </div>
      </motion.div>
    </div>
  )
}
