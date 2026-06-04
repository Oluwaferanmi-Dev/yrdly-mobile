import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme as useColorSchemeCore } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ActiveTheme = 'light' | 'dark';

interface ThemeContextType {
  themePreference: ThemePreference;
  activeTheme: ActiveTheme;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'yrdly_theme_preference';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const systemScheme = useColorSchemeCore() || 'light';
  const [activeTheme, setActiveTheme] = useState<ActiveTheme>(systemScheme);

  // Load saved preference on mount
  useEffect(() => {
    async function loadTheme() {
      try {
        const saved = await SecureStore.getItemAsync(THEME_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemePreferenceState(saved);
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      }
    }
    loadTheme();
  }, []);

  // Update active theme based on preference and system theme
  useEffect(() => {
    if (themePreference === 'system') {
      setActiveTheme(systemScheme);
    } else {
      setActiveTheme(themePreference);
    }
  }, [themePreference, systemScheme]);

  const setThemePreference = async (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    try {
      await SecureStore.setItemAsync(THEME_KEY, pref);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ themePreference, activeTheme, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};
