// Hell/Dunkel-Wahl. Die Farben selbst stehen als Variablen in src/index.css;
// hier wird nur entschieden, welcher Satz gilt.
//
// Ohne Wahl folgt die App dem System (`prefers-color-scheme`). Eine Wahl im
// Logo-Menü setzt `data-theme` auf <html> und gilt bis zum Reload — reiner
// UI-Zustand, deshalb kein localStorage (.claude/CLAUDE.md#architektur).

export type Theme = 'light' | 'dark';

const CHANGE_EVENT = 'bubble:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemTheme(): Theme {
  // jsdom kennt matchMedia nicht — dort gilt Hell.
  if (typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** Der Satz, der gerade auf dem Bildschirm steht. */
export function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme;
  return chosen === 'light' || chosen === 'dark' ? chosen : systemTheme();
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Meldet jede Änderung — eigene Wahl wie Systemwechsel. */
export function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  const media = typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null;
  media?.addEventListener('change', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    media?.removeEventListener('change', onChange);
  };
}
