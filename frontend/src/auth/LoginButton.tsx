/**
 * Login/Logout button component for Google OAuth authentication.
 * Displays user info when logged in, or a sign-in button when logged out.
 */

import { SignIn, SignOut, User as UserIcon } from '@phosphor-icons/react';
import { useAuth } from './AuthContext';
import './LoginButton.css';

export function LoginButton() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return (
      <div className="login-button loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="user-menu">
        <div className="user-info">
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt={user.user_metadata?.name || 'User'}
              className="user-avatar"
            />
          ) : (
            <UserIcon size={20} weight="regular" className="user-icon" />
          )}
          <span className="user-name">
            {user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
          </span>
        </div>
        <button className="sign-out-button" onClick={signOut} title="Sign out">
          <SignOut size={18} weight="regular" />
        </button>
      </div>
    );
  }

  return (
    <button className="sign-in-button" onClick={signIn}>
      <SignIn size={18} weight="regular" />
      <span>Sign in with Google</span>
    </button>
  );
}
