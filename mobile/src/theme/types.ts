/**
 * Type definitions for the theme system
 */

import { ColorScheme } from './colors';
import { Spacing } from './spacing';
import { Typography } from './typography';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  colors: ColorScheme;
  spacing: Spacing;
  typography: Typography;
  mode: ThemeMode;
}

export interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}
