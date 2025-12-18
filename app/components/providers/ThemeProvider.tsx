'use client';

import { createContext, useContext, useEffect } from 'react';

/**
 * Theme is permanently locked to 'dark'.
 * The Scroungers brand identity requires a dark forest green background.
 * Light mode is not supported.
 */
const THEME = 'dark' as const;

interface ThemeContextValue {
  theme: typeof THEME;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: THEME });

export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  // Ensure dark theme is always applied to document
  useEffect(() => {
    const doc = globalThis.document;
    if (doc === undefined) return;
    doc.documentElement.dataset.theme = THEME;
  }, []);

  return <ThemeContext.Provider value={{ theme: THEME }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
