// Hinweise je Position (WP-R, R1). Die Prüfregeln liefern eine flache Liste von
// Funden über dem ganzen LV; der Graph braucht die Gegenrichtung: „hat *diese*
// Position etwas, und wie schwer ist das Schwerste daran?".
//
// Das Umsortieren hängt am Import, nicht am Render: es läuft einmal je geladenem
// LV im `ViewerProvider` und danach nur noch, wenn eine Regel an- oder
// abgeschaltet wird (.claude/CLAUDE.md#kritische-constraints).
//
// Abgeschaltete Regeln zählen nicht mit: was in der Ansicht „Prüfung" stumm
// gestellt ist, darf im Graphen nicht weiter markieren — ein Filterzustand,
// alle Ansichten (decisions/0029).

import type { CheckResult, Flag, FlagSeverity } from './types';

export interface PositionHints {
  /** Der schwerste Fund an dieser Position — er bestimmt die Ringfarbe. */
  severity: FlagSeverity;
  /** Alle Funde, in der Reihenfolge des Regelkatalogs. */
  flags: readonly Flag[];
}

/** Positions-Knoten-ID → ihre Hinweise. Positionen ohne Fund fehlen. */
export type HintIndex = ReadonlyMap<string, PositionHints>;

export const EMPTY_HINTS: HintIndex = new Map<string, PositionHints>();

/** `beachten` schlägt `hinweis`. */
function worse(a: FlagSeverity, b: FlagSeverity): FlagSeverity {
  return a === 'beachten' || b === 'beachten' ? 'beachten' : 'hinweis';
}

export function hintsByPosition(
  check: CheckResult,
  mutedRules: ReadonlySet<string> = new Set(),
): HintIndex {
  const out = new Map<string, PositionHints>();
  for (const flag of check.flags) {
    if (mutedRules.has(flag.id)) continue;
    const known = out.get(flag.positionId);
    if (known === undefined) {
      out.set(flag.positionId, { severity: flag.severity, flags: [flag] });
      continue;
    }
    out.set(flag.positionId, {
      severity: worse(known.severity, flag.severity),
      flags: [...known.flags, flag],
    });
  }
  return out;
}

/**
 * Funde einer Position nach Regel gebündelt — so steht es auch in der Ansicht
 * „Prüfung", und die Auswahlkarte im Graphen zeigt dieselbe Gliederung.
 */
export function groupByRule(flags: readonly Flag[]): ReadonlyArray<[string, readonly Flag[]]> {
  const map = new Map<string, Flag[]>();
  for (const flag of flags) {
    const list = map.get(flag.id) ?? [];
    list.push(flag);
    map.set(flag.id, list);
  }
  return [...map];
}
