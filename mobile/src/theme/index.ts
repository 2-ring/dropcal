/**
 * Theme system exports
 * Centralized export point for all theme-related modules
 */

export { lightColors, darkColors } from './colors';
export type { ColorScheme } from './colors';

export { spacing } from './spacing';
export type { Spacing } from './spacing';

export { typography, fontWeights } from './typography';
export type { Typography, FontWeights } from './typography';

export { ThemeProvider, useTheme } from './ThemeProvider';

export type { Theme, ThemeMode, ThemeContextType } from './types';
