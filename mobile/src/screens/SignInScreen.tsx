/**
 * SignInScreen - Authentication screen
 * Shows Google sign-in button for users to authenticate
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../theme';
import { Logo, Icon } from '../components';
import { useAuth } from '../auth';

export function SignInScreen() {
  const { theme } = useTheme();
  const { signIn, loading } = useAuth();

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Logo and branding */}
        <View style={styles.header}>
          <Logo size={80} />
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            Welcome to DropCal
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Drop anything in. Get calendar events out.
          </Text>
        </View>

        {/* Sign in button */}
        <Pressable
          style={[
            styles.signInButton,
            { backgroundColor: theme.colors.primary },
            loading && styles.signInButtonDisabled,
          ]}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Icon name="SignIn" size={24} color="#ffffff" />
          <Text style={styles.signInButtonText}>
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </Text>
        </Pressable>

        {/* Features list */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <Icon name="CheckCircle" size={20} color={theme.colors.primary} />
            <Text style={[styles.featureText, { color: theme.colors.textSecondary }]}>
              Extract events from any text or image
            </Text>
          </View>
          <View style={styles.feature}>
            <Icon name="CheckCircle" size={20} color={theme.colors.primary} />
            <Text style={[styles.featureText, { color: theme.colors.textSecondary }]}>
              Automatic conflict detection
            </Text>
          </View>
          <View style={styles.feature}>
            <Icon name="CheckCircle" size={20} color={theme.colors.primary} />
            <Text style={[styles.featureText, { color: theme.colors.textSecondary }]}>
              One-click calendar integration
            </Text>
          </View>
        </View>

        {/* Guest mode link */}
        <Pressable
          style={styles.guestLink}
          onPress={() => {
            // TODO: Navigate to guest mode
            console.log('Guest mode not yet implemented');
          }}
        >
          <Text style={[styles.guestLinkText, { color: theme.colors.textSecondary }]}>
            Try without signing in (3 free sessions)
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 12,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  features: {
    marginTop: 48,
    gap: 16,
    alignSelf: 'stretch',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
  },
  guestLink: {
    marginTop: 32,
    paddingVertical: 12,
  },
  guestLinkText: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
