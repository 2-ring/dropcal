/**
 * Modal component for DropCal mobile app
 * Reusable modal with backdrop, animations, and theme support
 */

import React, { useEffect, useRef, ReactNode } from 'react';
import {
  Modal as RNModal,
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Modal Props
 */
export interface ModalProps {
  /** Whether modal is visible */
  visible: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal content */
  children: ReactNode;
  /** Modal title (optional header) */
  title?: ReactNode;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Whether backdrop is touchable to close */
  closeOnBackdropPress?: boolean;
  /** Custom modal height (default: 'auto') */
  height?: number | 'auto' | 'full';
  /** Whether content should be scrollable */
  scrollable?: boolean;
  /** Animation type */
  animationType?: 'slide' | 'fade';
  /** Custom modal container styles */
  containerStyle?: ViewStyle;
  /** Custom content container styles */
  contentStyle?: ViewStyle;
}

/**
 * Modal Component
 * Full-featured modal with backdrop, animations, and keyboard avoidance
 */
export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  title,
  showCloseButton = true,
  closeOnBackdropPress = true,
  height = 'auto',
  scrollable = false,
  animationType = 'slide',
  containerStyle,
  contentStyle,
}) => {
  const { theme } = useTheme();
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animations
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        animationType === 'slide'
          ? Animated.spring(slideAnimation, {
              toValue: 0,
              damping: 25,
              stiffness: 200,
              useNativeDriver: true,
            })
          : Animated.timing(fadeAnimation, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }),
      ]).start();
    } else {
      // Hide animations
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        animationType === 'slide'
          ? Animated.timing(slideAnimation, {
              toValue: SCREEN_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            })
          : Animated.timing(fadeAnimation, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
      ]).start();
    }
  }, [visible, animationType, backdropOpacity, slideAnimation, fadeAnimation]);

  const handleBackdropPress = () => {
    if (closeOnBackdropPress) {
      onClose();
    }
  };

  // Determine modal content height
  const getModalHeight = (): number | 'auto' | undefined => {
    if (height === 'full') return SCREEN_HEIGHT;
    if (height === 'auto') return undefined;
    return height;
  };

  const modalTransform =
    animationType === 'slide'
      ? [{ translateY: slideAnimation }]
      : undefined;

  const modalOpacity = animationType === 'fade' ? fadeAnimation : 1;

  const ContentWrapper = scrollable ? ScrollView : View;
  const contentWrapperProps = scrollable
    ? {
        showsVerticalScrollIndicator: true,
        contentContainerStyle: { flexGrow: 1 },
      }
    : { style: { flex: 1 } };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleBackdropPress}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: theme.colors.overlay || 'rgba(0, 0, 0, 0.5)',
                opacity: backdropOpacity,
              },
            ]}
          />
        </TouchableOpacity>

        {/* Modal Container */}
        <Animated.View
          style={[
            styles.modalContainer,
            {
              height: getModalHeight(),
              backgroundColor: theme.colors.backgroundElevated || theme.colors.background,
              shadowColor: theme.colors.shadowHeavy,
              transform: modalTransform,
              opacity: modalOpacity,
            },
            containerStyle,
          ]}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <View
              style={[
                styles.header,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                },
              ]}
            >
              {title && <View style={styles.titleContainer}>{title}</View>}
              {showCloseButton && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View
                    style={[
                      styles.closeIcon,
                      { backgroundColor: theme.colors.textTertiary },
                    ]}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          <ContentWrapper {...contentWrapperProps}>
            <View style={[styles.content, contentStyle]}>{children}</View>
          </ContentWrapper>
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: SCREEN_HEIGHT * 0.9,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  titleContainer: {
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  closeIcon: {
    width: 24,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  content: {
    padding: 20,
  },
});

/**
 * Simple Modal variant for quick alerts/confirmations
 */
export interface SimpleModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  children?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * SimpleModal Component
 * Pre-configured modal for alerts and confirmations
 */
export const SimpleModal: React.FC<SimpleModalProps> = ({
  visible,
  onClose,
  title,
  message,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  const { theme } = useTheme();

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      closeOnBackdropPress={false}
      showCloseButton={false}
      height="auto"
      animationType="fade"
    >
      <View style={{ gap: 20 }}>
        {/* Title */}
        {title && (
          <View>
            <Animated.Text
              style={{
                fontSize: theme.typography.h3.fontSize,
                fontWeight: theme.typography.h3.fontWeight,
                color: theme.colors.textPrimary,
                textAlign: 'center',
              }}
            >
              {title}
            </Animated.Text>
          </View>
        )}

        {/* Message */}
        {message && (
          <Animated.Text
            style={{
              fontSize: theme.typography.body.fontSize,
              color: theme.colors.textSecondary,
              textAlign: 'center',
              lineHeight: theme.typography.body.lineHeight,
            }}
          >
            {message}
          </Animated.Text>
        )}

        {/* Custom Content */}
        {children}

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {onCancel && (
            <TouchableOpacity
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 12,
                backgroundColor: theme.colors.backgroundSecondary,
                borderWidth: 1,
                borderColor: theme.colors.border,
                alignItems: 'center',
              }}
              onPress={handleCancel}
            >
              <Animated.Text
                style={{
                  fontSize: theme.typography.button.fontSize,
                  fontWeight: theme.typography.button.fontWeight,
                  color: theme.colors.textPrimary,
                }}
              >
                {cancelText}
              </Animated.Text>
            </TouchableOpacity>
          )}
          {onConfirm && (
            <TouchableOpacity
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 12,
                backgroundColor: theme.colors.primary,
                alignItems: 'center',
              }}
              onPress={handleConfirm}
            >
              <Animated.Text
                style={{
                  fontSize: theme.typography.button.fontSize,
                  fontWeight: theme.typography.button.fontWeight,
                  color: '#ffffff',
                }}
              >
                {confirmText}
              </Animated.Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};
