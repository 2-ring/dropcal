/**
 * AuthModal - Blocking overlay prompting user to sign in
 * Translated from frontend/src/auth/AuthModal.tsx
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal as RNModal,
  ActivityIndicator,
} from 'react-native';
import { Icon } from '../components';
import { useTheme } from '../theme';
import { useAuth } from './AuthContext';

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
  const { theme } = useTheme();
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

  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={showCloseButton ? onClose : undefined}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modal, { backgroundColor: theme.colors.background }]}>
          {showCloseButton && onClose && (
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={8}
            >
              <Icon name="X" size={20} color={theme.colors.textPrimary} />
            </Pressable>
          )}

          <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}15` }]}>
            <Icon name="SignIn" size={48} color={theme.colors.primary} />
          </View>

          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {finalTitle}
          </Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            {finalMessage}
          </Text>

          <Pressable
            style={[
              styles.button,
              { backgroundColor: theme.colors.primary },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.buttonText}>Signing in...</Text>
              </>
            ) : (
              <>
                <Icon name="SignIn" size={20} color="#ffffff" />
                <Text style={styles.buttonText}>Sign in with Google</Text>
              </>
            )}
          </Pressable>

          <Text style={[styles.footer, { color: theme.colors.textSecondary }]}>
            Get personalized events, conflict detection, and automatic calendar integration.
          </Text>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
