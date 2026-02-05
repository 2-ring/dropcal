/**
 * Auth Modal - Blocking overlay prompting user to sign in.
 * Shown when authentication is required (e.g., guest limit reached).
 */

import { SignIn, X } from '@phosphor-icons/react';
import { useAuth } from './AuthContext';
import './AuthModal.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  message?: string;
  showCloseButton?: boolean;
  reason?: 'calendar' | 'session_limit' | 'view_session';
}

export function AuthModal({
  isOpen,
  onClose,
  title,
  message,
  showCloseButton = false,
  reason = 'calendar',
}: AuthModalProps) {
  const { signIn, loading } = useAuth();

  if (!isOpen) return null;

  // Default messages based on reason
  const defaults = {
    calendar: {
      title: 'Sign In to Add to Calendar',
      message: 'Connect your Google Calendar to automatically add these events.',
    },
    session_limit: {
      title: 'Free Sessions Used Up',
      message: "You've used your 3 free sessions. Sign in to continue using DropCal.",
    },
    view_session: {
      title: 'Sign In Required',
      message: 'Please sign in to view this session.',
    },
  };

  const finalTitle = title || defaults[reason].title;
  const finalMessage = message || defaults[reason].message;

  const handleSignIn = async () => {
    try {
      await signIn();
      onClose?.();
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (showCloseButton && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div className="auth-modal-backdrop" onClick={handleBackdropClick}>
      <div className="auth-modal">
        {showCloseButton && onClose && (
          <button className="auth-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} weight="regular" />
          </button>
        )}

        <div className="auth-modal-icon">
          <SignIn size={48} weight="regular" />
        </div>

        <h2 className="auth-modal-title">{finalTitle}</h2>
        <p className="auth-modal-message">{finalMessage}</p>

        <button
          className="auth-modal-button"
          onClick={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="loading-spinner"></div>
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <SignIn size={20} weight="regular" />
              <span>Sign in with Google</span>
            </>
          )}
        </button>

        <p className="auth-modal-footer">
          Get personalized events, conflict detection, and automatic calendar integration.
        </p>
      </div>
    </div>
  );
}
