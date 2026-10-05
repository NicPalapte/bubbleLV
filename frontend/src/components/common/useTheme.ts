import { useSyncExternalStore } from 'react';
import { currentTheme, setTheme, subscribeTheme, type Theme } from '../../lib/theme';

/** Aktueller Satz (Hell/Dunkel) und der Schalter dafür. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, () => 'light' as const);
  return [theme, setTheme];
}
