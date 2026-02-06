/**
 * Supabase authentication client for DropCal Mobile.
 * Handles Google OAuth sign-in, sign-out, and session management for React Native.
 */

import { createClient } from '@supabase/supabase-js';
import type { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

// Environment variables from app.json/app.config.js
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your app.config.js or .env file.'
  );
}

// Web browser completion for OAuth flow
WebBrowser.maybeCompleteAuthSession();

/**
 * Create Supabase client with AsyncStorage for session persistence.
 * Sessions are automatically stored and retrieved from local storage.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Get redirect URL for OAuth flow.
 * Uses Expo's AuthSession to create a proper redirect URL.
 */
function getRedirectUrl(): string {
  const redirectUrl = AuthSession.makeRedirectUri({
    scheme: 'dropcal',
    path: 'auth/callback',
  });
  return redirectUrl;
}

/**
 * Sign in with Google OAuth using Expo AuthSession.
 * Opens the browser for OAuth flow and returns to the app with the session.
 *
 * @throws Error if sign-in fails or user cancels
 */
export async function signInWithGoogle(): Promise<void> {
  try {
    const redirectUrl = getRedirectUrl();

    // Start OAuth flow with Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        scopes: 'email profile openid',
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.url) {
      throw new Error('No OAuth URL returned from Supabase');
    }

    // Open browser for OAuth
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (result.type === 'success') {
      const { url } = result;

      // Extract tokens from callback URL
      const params = new URLSearchParams(url.split('#')[1]);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken) {
        // Set the session with the tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          throw sessionError;
        }
      }
    } else if (result.type === 'cancel') {
      throw new Error('User cancelled the sign-in flow');
    }
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

/**
 * Sign out the current user.
 * Clears session from AsyncStorage.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Get the current session.
 * Returns null if no active session.
 */
export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error('Get session error:', error);
    return null;
  }

  return session;
}

/**
 * Get the current user.
 * Returns null if no authenticated user.
 */
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Get user error:', error);
    return null;
  }

  return user;
}

/**
 * Get the current access token for API requests.
 * Returns null if no active session.
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 *
 * @param callback - Function called when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event: any, session: Session | null) => {
    callback(session);
  });

  return () => subscription.unsubscribe();
}

/**
 * Check if user is authenticated.
 * Convenience function for checking auth status.
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}
