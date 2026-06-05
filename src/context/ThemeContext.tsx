import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme as useColorSchemeCore } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Colors from '../constants/Colors';

export type ActiveTheme = 'light' | 'dark';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => Promise<void>;
  activeTheme: ActiveTheme;
  colors: typeof Colors.light;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'yrdly_dark_mode_enabled';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorSchemeCore() || 'light';
  const [isDarkMode, setIsDarkMode] = useState<boolean>(systemScheme === 'dark');

  // Load saved preference on mount
  useEffect(() => {
    async function loadTheme() {
      try {
        const saved = await SecureStore.getItemAsync(THEME_KEY);
        if (saved !== null) {
          setIsDarkMode(saved === 'true');
        } else {
          setIsDarkMode(systemScheme === 'dark');
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      }
    }
    loadTheme();
  }, [systemScheme]);

  const toggleTheme = async () => {
    const newVal = !isDarkMode;
    setIsDarkMode(newVal);
    try {
      await SecureStore.setItemAsync(THEME_KEY, String(newVal));
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const activeTheme: ActiveTheme = isDarkMode ? 'dark' : 'light';
  const colors = Colors[activeTheme];

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, activeTheme, colors }}>
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
