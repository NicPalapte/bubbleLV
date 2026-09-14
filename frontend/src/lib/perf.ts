// Messpunkte für die Zielwerte aus docs/scope.md: erste Ansicht < 5 s,
// Filterwechsel < 100 ms, Ansichtswechsel < 200 ms (WP-I, Schritt 5).
//
// Ausgabe ausschließlich in der Browser-Konsole — im UI steht nichts, und im
// Produktions-Bundle fällt der Aufruf weg (`import.meta.env.DEV` ist dort
// konstant false, der Bundler entfernt den Zweig). In Tests bleibt es still,
// sonst würde jeder Lauf die Ausgabe zumüllen.

/** Messpunkte sind nur im Entwicklungsmodus aktiv — und nie in Tests. */
export const PERF_ENABLED = import.meta.env.DEV && import.meta.env.MODE !== 'test';

/** Ab dieser Dauer ist eine Messung eine Warnung statt einer Notiz. */
const BUDGETS_MS: Readonly<Record<string, number>> = {
  'LV laden': 5000,
  'Positions-Index': 500,
  Filter: 100,
  Ansichtswechsel: 200,
};

function report(label: string, ms: number): void {
  if (!PERF_ENABLED) return;
  const budget = BUDGETS_MS[label];
  const text = `[perf] ${label}: ${ms.toFixed(1)} ms`;
  if (budget !== undefined && ms > budget) console.warn(`${text} (Ziel ≤ ${budget} ms)`);
  else console.debug(text);
}

/** Dauer eines synchronen Abschnitts messen und melden. */
export function measure<T>(label: string, run: () => T): T {
  if (!PERF_ENABLED) return run();
  const started = performance.now();
  try {
    return run();
  } finally {
    report(label, performance.now() - started);
  }
}

/** Dauer eines asynchronen Abschnitts messen und melden. */
export async function measureAsync<T>(label: string, run: () => Promise<T>): Promise<T> {
  if (!PERF_ENABLED) return run();
  const started = performance.now();
  try {
    return await run();
  } finally {
    report(label, performance.now() - started);
  }
}

let lastReportedView: string | null = null;

/**
 * Commit-Dauer der Hauptansicht melden — aber nur beim ersten Commit nach einem
 * Ansichtswechsel. Ohne diese Sperre stünde die Meldung auch hinter jedem
 * Filterwechsel, der dieselbe Ansicht neu zeichnet.
 */
export function reportViewSwitch(view: string, ms: number): void {
  if (!PERF_ENABLED || view === lastReportedView) return;
  lastReportedView = view;
  report('Ansichtswechsel', ms);
}
