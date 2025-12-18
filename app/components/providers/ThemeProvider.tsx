'use client';

/**
 * Scroungers Multimedia uses a single dark green theme.
 * No light theme is supported - brand identity is always dark forest green.
 */
export function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  // Always dark theme - no switching
  return <>{children}</>;
}

export function useTheme() {
  return {
    theme: 'dark' as const,
    // No-op functions since theme switching is disabled
    setTheme: () => {},
    toggleTheme: () => {},
  };
}

