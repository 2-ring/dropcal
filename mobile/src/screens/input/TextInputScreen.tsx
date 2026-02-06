import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput as RNTextInput,
  Animated,
} from 'react-native';
import { Icon } from '../../components/Icon';
import { readFromClipboard } from '../../utils/clipboard';
import { toast } from '../../components/Toast';
import { useTheme } from '../../theme';

export interface TextInputScreenProps {
  /** Close handler */
  onClose: () => void;
  /** Submit handler with text content */
  onSubmit: (text: string) => void;
}

/**
 * Text Input Screen - Dock Layout (1:1 Web Conversion)
 * 100px border-radius pill with horizontal layout
 */
export function TextInputScreen({ onClose, onSubmit }: TextInputScreenProps) {
  const [text, setText] = useState('');
  const { theme } = useTheme();

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text);
      setText('');
    }
  };

  const handlePaste = async () => {
    try {
      const clipboardText = await readFromClipboard();
      if (clipboardText) {
        setText(clipboardText);
      } else {
        toast.info('Clipboard Empty', {
          description: 'No text found in clipboard.',
          duration: 2000,
        });
      }
    } catch (err) {
      toast.error('Paste Failed', {
        description: 'Could not access clipboard. Please paste manually.',
        duration: 3000,
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
      {/* Backdrop overlay */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
      />

      {/* Input Container - Centered */}
      <View style={styles.inputContainer}>
        {/* Paste Button - Outside dock (left) */}
        <Animated.View style={styles.externalButtonWrapper}>
          <Pressable
            style={[styles.externalButton, { backgroundColor: theme.colors.background }]}
            onPress={handlePaste}
          >
            <Icon name="ClipboardText" size={24} color={theme.colors.primary} weight="duotone" />
          </Pressable>
        </Animated.View>

        {/* Close Button - Outside dock (left of dock) */}
        <Animated.View style={styles.externalButtonWrapper}>
          <Pressable
            style={[styles.closeButton, {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
            }]}
            onPress={onClose}
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
          {/* Text Input Field */}
          <RNTextInput
            value={text}
            onChangeText={setText}
            placeholder="Paste or type event details here..."
            placeholderTextColor={theme.colors.textTertiary}
            style={[styles.textInput, { color: theme.colors.textPrimary }]}
            autoFocus
            multiline={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </Animated.View>

        {/* Submit Button - Outside dock (right) */}
        <Animated.View style={styles.externalButtonWrapper}>
          <Pressable
            style={[
              styles.submitButton,
              {
                backgroundColor: text.trim()
                  ? theme.colors.primary
                  : theme.colors.disabled,
              },
            ]}
            onPress={handleSubmit}
            disabled={!text.trim()}
          >
            <Icon
              name="ArrowFatUp"
              size={28}
              color="#ffffff"
              weight="bold"
            />
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

  // External Buttons (outside dock)
  externalButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
