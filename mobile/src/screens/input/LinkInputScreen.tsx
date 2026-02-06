import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput as RNTextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Icon } from '../../components/Icon';
import { toast } from '../../components/Toast';
import { useTheme } from '../../theme';

export interface LinkInputScreenProps {
  /** Close handler */
  onClose: () => void;
  /** Submit handler with scraped content */
  onSubmit: (content: string) => void;
  /** API URL for backend */
  apiUrl?: string;
}

/**
 * Validate URL format
 */
const isValidUrl = (url: string): boolean => {
  if (!url.trim()) return false;

  // Simple URL regex that accepts http/https URLs
  const urlPattern = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/i;
  return urlPattern.test(url.trim());
};

/**
 * Link Input Screen - Dock Layout (1:1 Web Conversion)
 * 100px border-radius pill with horizontal layout
 */
export function LinkInputScreen({
  onClose,
  onSubmit,
  apiUrl = 'http://localhost:5000',
}: LinkInputScreenProps) {
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setIsValid(isValidUrl(value));
  };

  const handleSubmit = async () => {
    if (!isValid || !url.trim() || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      // Call backend endpoint to scrape URL
      const response = await fetch(`${apiUrl}/api/scrape-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Failed to fetch URL',
        }));
        throw new Error(
          errorData.message || errorData.error || 'Failed to fetch URL content'
        );
      }

      const data = await response.json();

      if (!data.content) {
        throw new Error('No content found at URL');
      }

      // Submit the extracted content
      onSubmit(data.content);
      setUrl('');
      setIsValid(false);

      toast.success('URL Scraped', {
        description: 'Content successfully extracted from URL.',
        duration: 2000,
      });
    } catch (err) {
      console.error('Failed to fetch URL:', err);
      toast.error('Failed to Fetch', {
        description:
          err instanceof Error
            ? err.message
            : 'Could not retrieve content from the URL. Please try again.',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
      {/* Backdrop overlay */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={isLoading ? undefined : onClose}
      />

      {/* Input Container - Centered */}
      <View style={styles.inputContainer}>
        {/* Close Button - Outside dock (left of dock) */}
        <Animated.View style={styles.externalButtonWrapper}>
          <Pressable
            style={[styles.closeButton, {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
            }]}
            onPress={onClose}
            disabled={isLoading}
          >
            <Icon
              name="FirstAid"
              size={24}
              color={theme.colors.textSecondary}
              weight="duotone"
              style={{ transform: [{ rotate: '45deg' }] }}
            />
          </Pressable>
        </Animated.View>

        {/* Dock - 100px border-radius pill */}
        <Animated.View
          style={[
            styles.dock,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Link Input Field */}
          <RNTextInput
            value={url}
            onChangeText={handleUrlChange}
            placeholder="Paste URL here..."
            placeholderTextColor={theme.colors.textTertiary}
            style={[
              styles.textInput,
              {
                color: theme.colors.textPrimary,
                textDecorationLine: isValid ? 'underline' : 'none',
                textDecorationColor: isValid ? theme.colors.primary : 'transparent',
              },
            ]}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={isValid && !isLoading ? handleSubmit : undefined}
            editable={!isLoading}
            autoFocus
            multiline={false}
          />
        </Animated.View>

        {/* Submit Button - Outside dock (right) */}
        <Animated.View style={styles.externalButtonWrapper}>
          <Pressable
            style={[
              styles.submitButton,
              {
                backgroundColor:
                  isValid && !isLoading
                    ? theme.colors.primary
                    : theme.colors.disabled,
              },
            ]}
            onPress={handleSubmit}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Icon
                name="ArrowFatUp"
                size={28}
                color="#ffffff"
                weight="bold"
              />
            )}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 600,
    paddingHorizontal: 20,
  },
  externalButtonWrapper: {
    // Animation wrapper
  },

  // Dock - 100px border-radius pill
  dock: {
    flex: 1,
    height: 64,
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Text Input - Transparent, no border
  textInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    fontFamily: 'Inter',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    margin: 0,
    outlineWidth: 0,
  },

  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  submitButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
