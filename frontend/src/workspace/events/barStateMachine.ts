/**
 * State Machine for Top and Bottom Bars
 *
 * Manages the dynamic behavior of header and footer bars based on context.
 * Each state defines what UI elements should be shown and how they behave.
 */

// ============================================================================
// Types
// ============================================================================

export type BottomBarState = 'default' | 'chatExpanded' | 'editMode' | 'loading'

export interface BarContext {
  // Core state
  isMobile: boolean
  isEditingEvent: boolean
  isChatExpanded: boolean
  isLoading: boolean

  // Additional context
  hasBackNavigation: boolean
}

// ============================================================================
// State Derivation
// ============================================================================

/**
 * Derives the current bottom bar state from context
 * Priority: loading > editMode > chatExpanded > default
 */
export function deriveBottomBarState(context: BarContext): BottomBarState {
  if (context.isLoading) return 'loading'
  if (context.isEditingEvent) return 'editMode'
  if (context.isChatExpanded) return 'chatExpanded'
  return 'default'
}

// ============================================================================
// State Configuration
// ============================================================================

export interface BottomBarStateConfig {
  // Left section
  showCancelButton: boolean

  // Middle section
  showRequestChangesButton: boolean
  showChatInput: boolean
  showSendButtonInInput: boolean

  // Right section
  showConfirmButton: boolean
  showSendButton: boolean
  showSaveButton: boolean

  // Behavior
  onCancel?: () => void
  onRequestChanges?: () => void
  onSend?: () => void
  onConfirm?: () => void
  onSave?: () => void
}

/**
 * Gets the UI configuration for a given state
 */
export function getBottomBarConfig(
  state: BottomBarState,
  context: BarContext
): Partial<BottomBarStateConfig> {
  switch (state) {
    case 'default':
      return {
        showCancelButton: false,
        showRequestChangesButton: true,
        showChatInput: false,
        showSendButtonInInput: false,
        showConfirmButton: true,
        showSendButton: false,
        showSaveButton: false,
      }

    case 'chatExpanded':
      return {
        showCancelButton: true,
        showRequestChangesButton: false,
        showChatInput: true,
        showSendButtonInInput: false, // Send button moves to right
        showConfirmButton: false,
        showSendButton: true, // Replaces confirm button
        showSaveButton: false,
      }

    case 'editMode':
      return {
        showCancelButton: true,
        showRequestChangesButton: false,
        showChatInput: false,
        showSendButtonInInput: false,
        showConfirmButton: false,
        showSendButton: false,
        showSaveButton: true,
      }

    case 'loading':
      return {
        showCancelButton: false,
        showRequestChangesButton: false,
        showChatInput: false,
        showSendButtonInInput: false,
        showConfirmButton: false,
        showSendButton: false,
        showSaveButton: false,
      }

    default:
      return {}
  }
}

// ============================================================================
// State Transitions
// ============================================================================

export type BarAction =
  | { type: 'OPEN_CHAT' }
  | { type: 'CLOSE_CHAT' }
  | { type: 'SEND_MESSAGE' }
  | { type: 'START_EDIT' }
  | { type: 'CANCEL_EDIT' }
  | { type: 'SAVE_EDIT' }
  | { type: 'START_LOADING' }
  | { type: 'FINISH_LOADING' }

/**
 * Handles state transitions
 * Returns the new context after applying the action
 */
export function transitionBarState(
  context: BarContext,
  action: BarAction
): Partial<BarContext> {
  switch (action.type) {
    case 'OPEN_CHAT':
      return { isChatExpanded: true }

    case 'CLOSE_CHAT':
      return { isChatExpanded: false }

    case 'SEND_MESSAGE':
      // After sending, close chat and return to default
      return { isChatExpanded: false }

    case 'START_EDIT':
      return { isEditingEvent: true, isChatExpanded: false }

    case 'CANCEL_EDIT':
      return { isEditingEvent: false }

    case 'SAVE_EDIT':
      // After saving, return to default
      return { isEditingEvent: false }

    case 'START_LOADING':
      return { isLoading: true }

    case 'FINISH_LOADING':
      return { isLoading: false }

    default:
      return {}
  }
}
