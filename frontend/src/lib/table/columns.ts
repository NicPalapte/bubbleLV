// Spaltenkonfiguration der Positionstabelle (Issue #41): Reihenfolge, ein-/
// ausgeblendete Spalten und Breiten. Reine Funktionen über einem unveränderlichen
// Wert — der Zustand selbst lebt als React-State in der Tabelle und überlebt
// keinen Reload (kein localStorage, siehe .claude/CLAUDE.md).

export interface ColumnConfig {
  /** Alle Spaltenschlüssel in Anzeigereihenfolge, auch die ausgeblendeten. */
  order: readonly string[];
  hidden: ReadonlySet<string>;
  /** Breite in Pixeln je Spalte. */
  widths: Readonly<Record<string, number>>;
}

/** Schmaler darf keine Spalte werden — sonst ist der Kopf nicht mehr greifbar. */
export const MIN_COLUMN_WIDTH = 48;
export const MAX_COLUMN_WIDTH = 900;

export function defaultColumnConfig(
  order: readonly string[],
  widths: Readonly<Record<string, number>>,
): ColumnConfig {
  return { order: [...order], hidden: new Set(), widths: { ...widths } };
}

/** Spalte um eine Stelle nach vorn (-1) oder hinten (+1) schieben. */
export function moveColumn(config: ColumnConfig, key: string, direction: -1 | 1): ColumnConfig {
  const from = config.order.indexOf(key);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= config.order.length) return config;
  const order = [...config.order];
  order.splice(from, 1);
  order.splice(to, 0, key);
  return { ...config, order };
}

/**
 * Spalte ein- bzw. ausblenden. `locked` sind Spalten, ohne die eine Zeile nicht
 * mehr zu erkennen wäre (OZ, Bezeichnung) — sie bleiben immer sichtbar.
 */
export function toggleColumn(
  config: ColumnConfig,
  key: string,
  locked: ReadonlySet<string> = new Set(),
): ColumnConfig {
  if (locked.has(key) || !config.order.includes(key)) return config;
  const hidden = new Set(config.hidden);
  if (!hidden.delete(key)) hidden.add(key);
  return { ...config, hidden };
}

export function resizeColumn(config: ColumnConfig, key: string, width: number): ColumnConfig {
  if (!config.order.includes(key)) return config;
  const clamped = Math.round(Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, width)));
  if (config.widths[key] === clamped) return config;
  return { ...config, widths: { ...config.widths, [key]: clamped } };
}

/** Sichtbare Spalten in Anzeigereihenfolge. */
export function visibleColumnKeys(config: ColumnConfig): string[] {
  return config.order.filter((key) => !config.hidden.has(key));
}
