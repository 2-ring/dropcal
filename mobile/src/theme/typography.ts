/**
 * Typography system for DropCal mobile app
 * Extracted from frontend/src/App.css and other CSS files
 *
 * All font sizes and line heights in pixels for React Native
 */

import { TextStyle } from 'react-native';

export const typography = {
  // Display font family (Chillax)
  displayFont: 'Chillax',

  // System font family
  systemFont: 'System',

  // Heading styles
  hero: {
    fontFamily: 'Chillax',
    fontSize: 50,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 50,
    letterSpacing: -1, // -0.02em approximation
  },

  h1: {
    fontFamily: 'Chillax',
    fontSize: 44,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 44,
    letterSpacing: -0.88, // -0.02em
  },

  h2: {
    fontFamily: 'System',
    fontSize: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 32,
  },

  h3: {
    fontFamily: 'System',
    fontSize: 20.8, // 1.3rem
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 28,
  },

  // Body text styles
  body: {
    fontFamily: 'System',
    fontSize: 16, // 1rem
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 24, // 1.5
  },

  bodyLarge: {
    fontFamily: 'System',
    fontSize: 19.2, // 1.2rem
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 28,
  },

  bodySmall: {
    fontFamily: 'System',
    fontSize: 14.4, // 0.9rem
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
  },

  // Drop area prompt
  dropPrompt: {
    fontFamily: 'System',
    fontSize: 24, // 1.5rem
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 32,
  },

  // Processing/feedback text
  processing: {
    fontFamily: 'System',
    fontSize: 17.6, // 1.1rem
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 24,
  },

  // Button text
  button: {
    fontFamily: 'System',
    fontSize: 16, // 1rem
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 20,
  },

  // Email/Link display
  link: {
    fontFamily: 'System',
    fontSize: 15.2, // 0.95rem
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
  },

  // Caption/Label text
  caption: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 16,
  },

  captionBold: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 16,
  },
} as const;

// Font weights
export const fontWeights = {
  light: '200' as TextStyle['fontWeight'],
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semiBold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
} as const;

export type Typography = typeof typography;
export type FontWeights = typeof fontWeights;
