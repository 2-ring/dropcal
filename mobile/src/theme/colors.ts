/**
 * Color palette for DropCal mobile app
 * Extracted from frontend/src/theme/lightTheme.ts and darkTheme.ts
 */

export const lightColors = {
  // Primary Brand Colors
  primary: '#1170C5',
  primaryHover: '#0D5A9E',
  primaryActive: '#0e5a9d',
  primaryLight: '#0d5aa3',
  primaryFaint: 'rgba(17, 112, 197, 0.08)',

  // Background Colors
  background: '#ffffff',
  backgroundSecondary: '#fafafa',
  backgroundHover: '#f5f5f5',
  backgroundActive: '#f0f0f0',
  backgroundElevated: 'rgba(255, 255, 255, 0.98)',

  // Text Colors
  textPrimary: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textDisabled: '#aaaaaa',

  // Border Colors
  border: '#e5e5e5',
  borderHover: '#d5d5d5',
  borderActive: '#e0e0e0',
  borderLight: 'rgba(0, 0, 0, 0.1)',

  // State Colors
  success: '#2e7d32',
  successLight: '#81c784',
  successBorder: '#a5d6a7',
  successBackground: '#e8f5e9',

  error: '#c41e3a',
  errorLight: '#a01729',
  errorBackground: 'rgba(196, 30, 58, 0.1)',

  warning: '#f59e0b',
  warningLight: '#fbbf24',
  warningBackground: 'rgba(245, 158, 11, 0.1)',

  info: '#666666',
  infoLight: '#999999',
  infoBackground: 'rgba(102, 102, 102, 0.05)',

  // Interactive Colors
  interactive: '#7C8FFF',
  interactiveLight: 'rgba(124, 143, 255, 0.06)',
  interactiveHover: 'rgba(124, 143, 255, 0.2)',

  // Overlay Colors
  shadowLight: 'rgba(0, 0, 0, 0.08)',
  shadowMedium: 'rgba(0, 0, 0, 0.15)',
  shadowHeavy: 'rgba(0, 0, 0, 0.25)',
  overlay: 'rgba(0, 0, 0, 0.05)',

  // Component-specific
  tooltipBackground: '#1a1a1a',
  tooltipText: '#ffffff',
  skeletonBackground: '#f0f0f0',
  skeletonBorder: '#fafafa',
  toggleActive: '#1a73e8',
  toggleInactive: '#dadce0',

  // Gradients for fade effects
  gradientFade0: 'rgba(255, 255, 255, 0)',
  gradientFade40: 'rgba(255, 255, 255, 0.5)',
  gradientFade65: 'rgba(255, 255, 255, 0.8)',
  gradientFade85: 'rgba(255, 255, 255, 0.95)',
  gradientFade100: 'rgba(255, 255, 255, 1)',

  // Additional colors for input screens
  surface: '#fafafa',
  disabled: '#cccccc',
};

export const darkColors = {
  // Primary Brand Colors - slightly lighter for dark backgrounds
  primary: '#4A9EFF',
  primaryHover: '#6BB1FF',
  primaryActive: '#3A8EEF',
  primaryLight: '#5AA5FF',
  primaryFaint: 'rgba(74, 158, 255, 0.12)',

  // Background Colors - dark grays
  background: '#1a1a1a',
  backgroundSecondary: '#2a2a2a',
  backgroundHover: '#333333',
  backgroundActive: '#3a3a3a',
  backgroundElevated: '#242424',

  // Text Colors - light grays for dark backgrounds
  textPrimary: '#e8e8e8',
  textSecondary: '#b8b8b8',
  textTertiary: '#888888',
  textDisabled: '#666666',

  // Border Colors - subtle borders for dark mode
  border: '#3a3a3a',
  borderHover: '#4a4a4a',
  borderActive: '#5a5a5a',
  borderLight: 'rgba(255, 255, 255, 0.1)',

  // State Colors
  success: '#66bb6a',
  successLight: '#81c784',
  successBorder: '#4a7c4e',
  successBackground: '#1b3a1f',

  error: '#d32f2f',
  errorLight: '#e57373',
  errorBackground: 'rgba(211, 47, 47, 0.15)',

  warning: '#fbbf24',
  warningLight: '#fcd34d',
  warningBackground: 'rgba(251, 191, 36, 0.15)',

  info: '#b8b8b8',
  infoLight: '#e8e8e8',
  infoBackground: 'rgba(184, 184, 184, 0.1)',

  // Interactive Colors - bright purple for dark backgrounds
  interactive: '#9BA8FF',
  interactiveLight: 'rgba(155, 168, 255, 0.1)',
  interactiveHover: 'rgba(155, 168, 255, 0.25)',

  // Overlay Colors
  shadowLight: 'rgba(0, 0, 0, 0.3)',
  shadowMedium: 'rgba(0, 0, 0, 0.5)',
  shadowHeavy: 'rgba(0, 0, 0, 0.7)',
  overlay: 'rgba(0, 0, 0, 0.2)',

  // Component-specific
  tooltipBackground: '#333333',
  tooltipText: '#ffffff',
  skeletonBackground: '#2a2a2a',
  skeletonBorder: '#3a3a3a',
  toggleActive: '#4A9EFF',
  toggleInactive: '#4a4a4a',

  // Gradients for fade effects
  gradientFade0: 'rgba(26, 26, 26, 0)',
  gradientFade40: 'rgba(26, 26, 26, 0.5)',
  gradientFade65: 'rgba(26, 26, 26, 0.8)',
  gradientFade85: 'rgba(26, 26, 26, 0.95)',
  gradientFade100: 'rgba(26, 26, 26, 1)',

  // Additional colors for input screens
  surface: '#2a2a2a',
  disabled: '#555555',
};

export type ColorScheme = typeof lightColors;
