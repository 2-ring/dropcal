/**
 * Authentication module exports.
 * Centralized exports for all auth-related functionality.
 */

// Supabase client and functions
export {
  supabase,
  signInWithGoogle,
  signOut,
  getSession,
  getCurrentUser,
  getAccessToken,
  onAuthStateChange,
  isAuthenticated,
} from './supabase';

// Auth context and hooks
export { AuthProvider, useAuth } from './AuthContext';
