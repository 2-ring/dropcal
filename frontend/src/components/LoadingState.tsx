import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Icon } from '@phosphor-icons/react'
import type { LoadingStateConfig, LoadingPhase } from '../types/loadingState'

interface LoadingStateProps {
  /** Single message or array of phased messages */
  config: LoadingStateConfig | LoadingPhase[]
  /** Whether to show the loading state */
  isLoading: boolean
}

export function LoadingState({ config, isLoading }: LoadingStateProps) {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [currentMessage, setCurrentMessage] = useState('')
  const [currentSubmessage, setCurrentSubmessage] = useState<string | undefined>()
  const [currentIcon, setCurrentIcon] = useState<Icon | undefined>()

  useEffect(() => {
    if (!isLoading) {
      setCurrentPhaseIndex(0)
      setCurrentMessage('')
      setCurrentSubmessage(undefined)
      setCurrentIcon(undefined)
      return
    }

    // Handle single config
    if (!Array.isArray(config)) {
      setCurrentMessage(config.message)
      setCurrentSubmessage(config.submessage)
      setCurrentIcon(config.icon)
      return
    }

    // Handle phased loading
    const phases = config as LoadingPhase[]
    if (phases.length === 0) return

    // Set initial phase
    setCurrentMessage(phases[0].message)
    setCurrentSubmessage(phases[0].submessage)
    setCurrentIcon(phases[0].icon)
    setCurrentPhaseIndex(0)

    // Schedule phase transitions
    const timeouts: ReturnType<typeof setTimeout>[] = []

    phases.forEach((phase, index) => {
      if (index === 0) return // Skip first phase as it's already set

      const timeout = setTimeout(() => {
        setCurrentPhaseIndex(index)
        setCurrentMessage(phase.message)
        setCurrentSubmessage(phase.submessage)
        setCurrentIcon(phase.icon)
      }, phase.delay || 0)

      timeouts.push(timeout)
    })

    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [config, isLoading])

  if (!isLoading) return null

  return (
    <div className="flex items-center justify-center w-full h-full min-h-[180px] pointer-events-none [perspective:1000px]">
      <div className="flex flex-col items-center justify-center gap-4 p-8 max-w-[80%]">
        {/* Main message with flip animation */}
        <div className="relative min-h-[2.5rem] flex items-center justify-center [transform-style:preserve-3d]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMessage}
              className="text-xl font-medium italic text-[var(--primary-color)] text-center tracking-[-0.02em] leading-[1.3] [transform-style:preserve-3d] [backface-visibility:hidden] [text-shadow:0_2px_4px_rgba(0,0,0,0.05)] flex items-center justify-center gap-3 md:text-xl"
              initial={{
                rotateX: 90,
                opacity: 0,
                y: 20
              }}
              animate={{
                rotateX: 0,
                opacity: 1,
                y: 0
              }}
              exit={{
                rotateX: -90,
                opacity: 0,
                y: -20
              }}
              transition={{
                duration: 0.5,
                ease: [0.34, 1.56, 0.64, 1]
              }}
            >
              {currentIcon && (
                <motion.span
                  className="flex items-center justify-center text-[var(--primary-color)] flex-shrink-0"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  {(() => {
                    const IconComponent = currentIcon
                    return <IconComponent size={28} weight="bold" />
                  })()}
                </motion.span>
              )}
              <span className="inline-block">{currentMessage}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Submessage with fade animation */}
        {currentSubmessage && (
          <div className="relative min-h-[1.5rem] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSubmessage}
                className="text-base font-normal text-[#666] text-center leading-[1.4] md:text-[0.9rem]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {currentSubmessage}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Progress indicator for phased loading */}
        {Array.isArray(config) && config.length > 1 && (
          <div className="flex gap-2 mt-2 w-50 md:w-37.5">
            {config.map((_, index) => (
              <motion.div
                key={index}
                className="flex-1 h-0.75 rounded-sm origin-left"
                initial={{ scaleX: 0 }}
                animate={{
                  scaleX: index <= currentPhaseIndex ? 1 : 0,
                  backgroundColor: index <= currentPhaseIndex
                    ? 'var(--primary-color)'
                    : 'rgba(17, 112, 197, 0.2)'
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
