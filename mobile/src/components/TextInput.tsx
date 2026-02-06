import React, { useState } from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps as RNTextInputProps,
} from 'react-native';

export interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  /** Input label */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Leading icon */
  icon?: React.ReactNode;
  /** Trailing icon or action */
  trailingIcon?: React.ReactNode;
  /** Container style */
  containerStyle?: ViewStyle;
  /** Input style */
  inputStyle?: TextStyle;
  /** Disabled state */
  disabled?: boolean;
  /** Full width */
  fullWidth?: boolean;
}

/**
 * Styled TextInput component for React Native
 * Supports labels, errors, helper text, and icons
 */
export function TextInput({
  label,
  error,
  helperText,
  icon,
  trailingIcon,
  containerStyle,
  inputStyle,
  disabled = false,
  fullWidth = false,
  ...textInputProps
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const hasError = !!error;

  return (
    <View style={[styles.container, fullWidth && styles.fullWidth, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          hasError && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}

        <RNTextInput
          {...textInputProps}
          editable={!disabled}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          style={(() => {
            const inputStyles: TextStyle[] = [styles.input];
            if (icon) inputStyles.push(styles.inputWithIcon);
            if (trailingIcon) inputStyles.push(styles.inputWithTrailingIcon);
            if (inputStyle) inputStyles.push(inputStyle);
            return inputStyles;
          })()}
          placeholderTextColor="#9CA3AF"
        />

        {trailingIcon && (
          <View style={styles.trailingIconContainer}>{trailingIcon}</View>
        )}
      </View>

      {(error || helperText) && (
        <Text style={[styles.helperText, hasError && styles.errorText]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: '#E5E7EB',
    borderRadius: 0,
    paddingHorizontal: 16,
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputContainerFocused: {
    borderColor: 'transparent',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  inputContainerError: {
    borderColor: 'transparent',
  },
  inputContainerDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 12,
  },
  inputWithIcon: {
    paddingLeft: 8,
  },
  inputWithTrailingIcon: {
    paddingRight: 8,
  },
  iconContainer: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trailingIconContainer: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    color: '#EF4444',
  },
});
