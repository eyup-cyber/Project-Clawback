'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'scroungers-theme';

function getDefaultTheme(): Theme {
  // Default to dark theme - this is the brand identity
  return 'dark';
}

type ThemeAction = { type: 'set'; theme: Theme };

function themeReducer(_state: Theme, action: ThemeAction): Theme {
  if (action.type === 'set') return action.theme;
  return _state;
}

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [theme, dispatch] = useReducer(themeReducer, 'dark', () => {
    const w = globalThis.window;
    if (w === undefined) return 'dark';
    const stored = w.localStorage?.getItem(STORAGE_KEY) as Theme | null;
    return stored ?? getDefaultTheme();
  });

  // Apply theme to document and persist
  useEffect(() => {
    const doc = globalThis.document;
    if (doc === undefined) return;
    const root = doc.documentElement;
    root.dataset.theme = theme;
    globalThis.localStorage?.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => dispatch({ type: 'set', theme: next }), []);

  const toggleTheme = useCallback(() => {
    dispatch({ type: 'set', theme: theme === 'dark' ? 'light' : 'dark' });
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

