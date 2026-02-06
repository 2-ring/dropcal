/**
 * ThemeProvider component for DropCal mobile app
 * Provides theme context with light/dark mode switching
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';
import type { Theme, ThemeContextType, ThemeMode } from './types';

const THEME_STORAGE_KEY = '@dropcal_theme_mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Hook to access the current theme
 * @throws Error if used outside of ThemeProvider
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider component that wraps the app and provides theme context
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme(); // Get system preference
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode === 'light' || savedMode === 'dark') {
          setThemeModeState(savedMode);
        } else if (systemColorScheme) {
          // Use system preference if no saved preference
          setThemeModeState(systemColorScheme);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
        // Fall back to system preference or light mode
        setThemeModeState(systemColorScheme || 'light');
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, [systemColorScheme]);

  // Create theme object based on current mode
  const theme: Theme = {
    colors: themeMode === 'light' ? lightColors : darkColors,
    spacing,
    typography,
    mode: themeMode,
  };

  /**
   * Set theme mode and persist to storage
   */
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  /**
   * Toggle between light and dark modes
   */
  const toggleTheme = () => {
    const newMode: ThemeMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  };

  // Don't render children until theme is loaded
  // This prevents flash of wrong theme
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
