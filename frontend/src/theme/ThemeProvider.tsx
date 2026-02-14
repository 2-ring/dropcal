import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { Theme, ThemeMode } from './types';
import { lightTheme } from './lightTheme';
import { darkTheme } from './darkTheme';
import { useAuth } from '../auth/AuthContext';
import { updateUserPreferences } from '../api/backend-client';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const applyCSSVariables = (theme: Theme) => {
  const root = document.documentElement;

  // Apply each theme property as a CSS variable
  Object.entries(theme).forEach(([key, value]) => {
    // Convert camelCase to kebab-case (e.g., primaryHover -> primary-hover)
    const cssVarName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--${cssVarName}`, value);
  });
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

const getSystemTheme = (): ThemeMode =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { session, preferences, setPreferences } = useAuth();
  const syncedFromBackend = useRef(false);

  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    // Initialize from localStorage for instant load (no flash)
    const saved = localStorage.getItem('theme-mode');
    if (saved === 'dark' || saved === 'light') return saved;
    // Fall back to system/browser preference
    return getSystemTheme();
  });

  // Listen for system theme changes (applies when user hasn't manually chosen)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      // Only follow system changes if user hasn't explicitly set a preference
      if (!localStorage.getItem('theme-mode')) {
        setThemeModeState(e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Sync theme from backend preferences when they load
  useEffect(() => {
    if (session && preferences.theme_mode && !syncedFromBackend.current) {
      syncedFromBackend.current = true;
      setThemeModeState(preferences.theme_mode);
      localStorage.setItem('theme-mode', preferences.theme_mode);
    }
  }, [session, preferences.theme_mode]);

  // Reset sync flag on logout
  useEffect(() => {
    if (!session) {
      syncedFromBackend.current = false;
    }
  }, [session]);

  const theme = themeMode === 'light' ? lightTheme : darkTheme;

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('theme-mode', mode);

    // Persist to backend if authenticated
    if (session) {
      setPreferences(prev => ({ ...prev, theme_mode: mode }));
      updateUserPreferences({ theme_mode: mode }).catch((err) => {
        console.error('Failed to save theme preference:', err);
      });
    }
  };

  const toggleTheme = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    // Apply CSS variables whenever theme changes
    applyCSSVariables(theme);

    // Add data attribute to body for theme-specific styling
    document.body.setAttribute('data-theme', themeMode);
  }, [theme, themeMode]);

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
