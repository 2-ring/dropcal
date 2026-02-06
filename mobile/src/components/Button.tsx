import React from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';

export interface ButtonProps {
  /** Button text */
  children: React.ReactNode;
  /** Press handler */
  onPress: () => void;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'action' | 'signin';
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** Leading icon (left side) */
  icon?: React.ReactNode;
  /** Trailing icon (right side) */
  trailingIcon?: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Custom styles for container */
  style?: ViewStyle;
  /** Custom styles for text */
  textStyle?: TextStyle;
  /** Full width button */
  fullWidth?: boolean;
}

/**
 * Reusable button component for React Native
 * Supports multiple variants, sizes, icons, and states
 */
export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  trailingIcon,
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  // Get variant styles
  const variantContainerStyle = styles[`${variant}Container` as keyof typeof styles] || styles.primaryContainer;
  const variantTextStyle = styles[`${variant}Text` as keyof typeof styles] || styles.primaryText;

  // Get size styles
  const sizeStyle = styles[`${size}Size` as keyof typeof styles] || styles.mediumSize;

  // Build style array
  const getContainerStyle = (pressed: boolean): ViewStyle[] => {
    const styleArray: ViewStyle[] = [
      styles.base,
      variantContainerStyle,
      sizeStyle,
    ];

    if (fullWidth) styleArray.push(styles.fullWidth);
    if (isDisabled) styleArray.push(styles.disabled);
    if (pressed && !isDisabled) styleArray.push(styles.pressed);
    if (style) styleArray.push(style);

    return styleArray;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => getContainerStyle(pressed)}
    >
      {() => (
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={variant === 'primary' ? '#ffffff' : '#1170C5'}
              style={styles.loader}
            />
          ) : (
            <>
              {icon && <View style={styles.iconContainer}>{icon}</View>}
              <Text
                style={[
                  styles.baseText,
                  variantTextStyle,
                  styles[`${size}Text` as keyof typeof styles],
                  textStyle,
                ]}
              >
                {children}
              </Text>
              {trailingIcon && (
                <View style={styles.trailingIconContainer}>{trailingIcon}</View>
              )}
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  baseText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '400',
  },

  // Variants
  primaryContainer: {
    backgroundColor: '#1170C5',
    borderColor: '#1170C5',
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '600',
  },

  secondaryContainer: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
  },
  secondaryText: {
    color: '#1F2937',
  },

  actionContainer: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
  },
  actionText: {
    color: '#1F2937',
  },

  signinContainer: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
  },
  signinText: {
    color: '#1F2937',
  },

  // Sizes
  smallSize: {
    height: 44,
    paddingHorizontal: 16,
  },
  mediumSize: {
    height: 56,
    paddingHorizontal: 16,
  },
  largeSize: {
    height: 64,
    paddingHorizontal: 20,
  },

  // Size text
  smallText: {
    fontSize: 13,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },

  // States
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  // Layout
  fullWidth: {
    width: '100%',
  },

  // Icons
  iconContainer: {
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trailingIconContainer: {
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  loader: {
    marginRight: 8,
  },
});
