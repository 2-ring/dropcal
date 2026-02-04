import { motion, AnimatePresence } from 'framer-motion'
import { X as XIcon, CheckFat as CheckIcon, ChatCircleDots as ChatIcon, PaperPlaneRight as SendIcon, CaretLeft as BackIcon, FloppyDisk as SaveIcon } from '@phosphor-icons/react'
import Skeleton from 'react-loading-skeleton'
import type { LoadingStateConfig } from './types'
import { CalendarSelector } from './CalendarSelector'
import { deriveBottomBarState, getBottomBarConfig, type BarContext } from './barStateMachine'

// ============================================================================
// TOP BAR
// ============================================================================

interface TopBarProps {
  wordmarkImage: string
  eventCount: number
  isLoading: boolean
  expectedEventCount?: number
  isLoadingCalendars?: boolean
  showBackButton?: boolean
  onBack?: () => void
}

export function TopBar({
  wordmarkImage,
  eventCount,
  isLoading,
  expectedEventCount,
  isLoadingCalendars = false,
  showBackButton = false,
  onBack
}: TopBarProps) {
  return (
    <div className="event-confirmation-header">
      <div className="event-confirmation-header-content">
        <div className="header-left">
          {showBackButton && onBack && (
            <button
              className="header-back-button"
              onClick={onBack}
              title="Back to menu"
            >
              <BackIcon size={20} weight="bold" />
            </button>
          )}
          <CalendarSelector isLoading={isLoadingCalendars} />
        </div>
        <div className="header-center">
          <img src={wordmarkImage} alt="DropCal" className="header-wordmark" />
        </div>
        <div className="header-right">
          {isLoading && expectedEventCount === undefined ? (
            <Skeleton width={80} height={20} />
          ) : (
            <span>
              {isLoading ? expectedEventCount : eventCount} {(isLoading ? expectedEventCount : eventCount) === 1 ? 'event' : 'events'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// BOTTOM BAR
// ============================================================================

interface BottomBarProps {
  // State machine context
  context: BarContext

  // Loading state
  loadingConfig?: LoadingStateConfig[]

  // Chat state
  changeRequest: string
  isProcessingEdit: boolean

  // Callbacks
  onCancel: () => void
  onRequestChanges: () => void
  onChangeRequestChange: (value: string) => void
  onSend: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onConfirm?: () => void
  onSave?: () => void
}

export function BottomBar({
  context,
  loadingConfig = [],
  changeRequest,
  isProcessingEdit,
  onCancel,
  onRequestChanges,
  onChangeRequestChange,
  onSend,
  onKeyDown,
  onConfirm,
  onSave,
}: BottomBarProps) {
  // Derive state and configuration
  const state = deriveBottomBarState(context)
  const config = getBottomBarConfig(state, context)

  return (
    <div className="event-confirmation-footer-overlay">
      <div className="event-confirmation-footer">
        {state === 'loading' ? (
          /* Progress indicators during loading */
          <div className="loading-progress-container">
            <div className="loading-progress-steps">
              {loadingConfig.map((loadingStep, index) => {
                const IconComponent = loadingStep.icon
                return (
                  <motion.div
                    key={index}
                    className="loading-progress-step"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    {IconComponent && (
                      <div className="loading-progress-icon">
                        <IconComponent size={20} weight="bold" />
                      </div>
                    )}
                    <div className="loading-progress-text">
                      <div className="loading-progress-message" style={{ fontStyle: 'italic' }}>
                        {loadingStep.message}
                      </div>
                      {loadingStep.submessage && (
                        <div className="loading-progress-submessage">{loadingStep.submessage}</div>
                      )}
                    </div>
                    {loadingStep.count && (
                      <div className="loading-progress-count">{loadingStep.count}</div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        ) : (
          /* Dynamic content based on state */
          <div className="event-confirmation-footer-row">
            <AnimatePresence mode="wait">
              <motion.div
                key={state}
                className="event-confirmation-footer-content"
                initial={{ y: 20, scale: 0.95, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: -20, scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Left: Cancel button (edit mode or chat expanded) */}
                {config.showCancelButton && (
                  <button
                    className="event-confirmation-icon-button cancel"
                    onClick={onCancel}
                    title="Cancel"
                  >
                    <XIcon size={20} weight="bold" />
                  </button>
                )}

                {/* Middle: Request changes button */}
                {config.showRequestChangesButton && (
                  <button
                    className="event-confirmation-request-button"
                    onClick={onRequestChanges}
                  >
                    <ChatIcon size={18} weight="bold" />
                    <span>Request changes</span>
                  </button>
                )}

                {/* Middle: Chat input (no send button inside) */}
                {config.showChatInput && (
                  <div className="event-confirmation-chat-input-wrapper">
                    <input
                      type="text"
                      className="event-confirmation-chat-input"
                      placeholder="Request changes..."
                      value={changeRequest}
                      onChange={(e) => onChangeRequestChange(e.target.value)}
                      onKeyDown={onKeyDown}
                      autoFocus
                    />
                  </div>
                )}

                {/* Middle: Save button (edit mode) */}
                {config.showSaveButton && onSave && (
                  <button
                    className="event-confirmation-save-button"
                    onClick={onSave}
                  >
                    <SaveIcon size={18} weight="bold" />
                    <span>Save changes</span>
                  </button>
                )}

                {/* Right: Confirm button */}
                {config.showConfirmButton && onConfirm && (
                  <button
                    className="event-confirmation-icon-button confirm"
                    onClick={onConfirm}
                    title="Add to Calendar"
                  >
                    <CheckIcon size={24} weight="bold" />
                  </button>
                )}

                {/* Right: Send button (replaces confirm when chat is open) */}
                {config.showSendButton && (
                  <button
                    className="event-confirmation-icon-button send"
                    onClick={onSend}
                    disabled={!changeRequest.trim() || isProcessingEdit}
                    title="Send"
                  >
                    <SendIcon size={22} weight="fill" />
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
