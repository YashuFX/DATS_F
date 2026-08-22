'use client';

import React, { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { applyTheme, readTheme, THEME_EVENT, type Theme } from '@/lib/theme';

/**
 * Theme state for components that need to *read* the current theme (the header
 * toggle picks its glyph from it, the map picks a tile filter).
 *
 * The switching mechanism moved to `lib/theme.ts` and a `data-theme` attribute
 * on <html>, matching DATS_ARCHIVAL, so the two applications theme identically
 * and can eventually share chrome. Two things changed as a result:
 *
 *  - the attribute is set by a blocking script in <head>, before first paint,
 *    so reloading in dark no longer flashes white;
 *  - the OS preference is honoured when nothing has been chosen, instead of
 *    the previous hard default to dark.
 *
 * The theme is read with `useSyncExternalStore` rather than mirrored into
 * `useState` from an effect. The DOM attribute *is* the source of truth — it is
 * set before React exists — so copying it into state would mean a second render
 * on every mount and a window where React disagrees with what is painted.
 *
 * The `useTheme()` API is unchanged, so no consumer had to be rewritten.
 */

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function subscribe(onChange: () => void) {
  // `THEME_EVENT` covers this tab; `storage` covers another tab or the
  // archival board, which writes the same key.
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

// The server has no DOM to read, and `globals.css` already themes a
// no-attribute document from `prefers-color-scheme`, so the markup this pairs
// with is theme-neutral either way.
const getServerSnapshot = (): Theme => 'light';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => applyTheme(next), []);
  const toggleTheme = useCallback(() => {
    applyTheme(readTheme() === 'dark' ? 'light' : 'dark');
  }, []);

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
