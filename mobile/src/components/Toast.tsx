/**
 * Toast component for DropCal mobile app
 * Replaces sonner with react-native-toast-message
 */

import React from 'react';
import RNToast, { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import { useTheme } from '../theme/ThemeProvider';
import type { BaseToastProps } from 'react-native-toast-message';

/**
 * Toast configuration with theme support
 */
export const ToastProvider: React.FC = () => {
  const { theme } = useTheme();

  const toastConfig = {
    success: (props: BaseToastProps) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: theme.colors.success,
          backgroundColor: theme.colors.background,
          borderLeftWidth: 5,
        }}
        contentContainerStyle={{
          paddingHorizontal: 15,
        }}
        text1Style={{
          fontSize: theme.typography.body.fontSize,
          fontWeight: '600',
          color: theme.colors.textPrimary,
        }}
        text2Style={{
          fontSize: theme.typography.caption.fontSize,
          color: theme.colors.textSecondary,
        }}
      />
    ),
    error: (props: BaseToastProps) => (
      <ErrorToast
        {...props}
        style={{
          borderLeftColor: theme.colors.error,
          backgroundColor: theme.colors.background,
          borderLeftWidth: 5,
        }}
        contentContainerStyle={{
          paddingHorizontal: 15,
        }}
        text1Style={{
          fontSize: theme.typography.body.fontSize,
          fontWeight: '600',
          color: theme.colors.textPrimary,
        }}
        text2Style={{
          fontSize: theme.typography.caption.fontSize,
          color: theme.colors.textSecondary,
        }}
      />
    ),
    info: (props: BaseToastProps) => (
      <InfoToast
        {...props}
        style={{
          borderLeftColor: theme.colors.info,
          backgroundColor: theme.colors.background,
          borderLeftWidth: 5,
        }}
        contentContainerStyle={{
          paddingHorizontal: 15,
        }}
        text1Style={{
          fontSize: theme.typography.body.fontSize,
          fontWeight: '600',
          color: theme.colors.textPrimary,
        }}
        text2Style={{
          fontSize: theme.typography.caption.fontSize,
          color: theme.colors.textSecondary,
        }}
      />
    ),
    warning: (props: BaseToastProps) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: theme.colors.warning,
          backgroundColor: theme.colors.background,
          borderLeftWidth: 5,
        }}
        contentContainerStyle={{
          paddingHorizontal: 15,
        }}
        text1Style={{
          fontSize: theme.typography.body.fontSize,
          fontWeight: '600',
          color: theme.colors.textPrimary,
        }}
        text2Style={{
          fontSize: theme.typography.caption.fontSize,
          color: theme.colors.textSecondary,
        }}
      />
    ),
  };

  return <RNToast config={toastConfig} />;
};

/**
 * Toast options interface (matching sonner API)
 */
interface ToastOptions {
  description?: string;
  duration?: number;
  position?: 'top' | 'bottom';
}

/**
 * Toast API wrapper (matching sonner API)
 */
export const toast = {
  /**
   * Show a success toast
   */
  success: (message: string, options?: ToastOptions) => {
    RNToast.show({
      type: 'success',
      text1: message,
      text2: options?.description,
      visibilityTime: options?.duration || 4000,
      position: options?.position || 'top',
    });
  },

  /**
   * Show an error toast
   */
  error: (message: string, options?: ToastOptions) => {
    RNToast.show({
      type: 'error',
      text1: message,
      text2: options?.description,
      visibilityTime: options?.duration || 4000,
      position: options?.position || 'top',
    });
  },

  /**
   * Show an info toast
   */
  info: (message: string, options?: ToastOptions) => {
    RNToast.show({
      type: 'info',
      text1: message,
      text2: options?.description,
      visibilityTime: options?.duration || 4000,
      position: options?.position || 'top',
    });
  },

  /**
   * Show a warning toast
   */
  warning: (message: string, options?: ToastOptions) => {
    RNToast.show({
      type: 'warning',
      text1: message,
      text2: options?.description,
      visibilityTime: options?.duration || 4000,
      position: options?.position || 'top',
    });
  },

  /**
   * Hide all toasts
   */
  dismiss: () => {
    RNToast.hide();
  },
};
