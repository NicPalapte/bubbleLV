// Befehle der Kommandopalette (WP-P, Schritt 1).
//
// **Reine Funktionen, keine Oberfläche.** Jeder Befehl trägt die Aktionen, die
// er auslöst, als Daten bei sich — damit steht in einem Test, was ein Befehl
// tut, ohne dass ein Fenster geöffnet werden muss.
//
// Die Palette **ergänzt** die Oberfläche, sie ersetzt keine Logik: Filter
// laufen über dieselben Aktionen wie die Chips in der Kopfleiste, die Suche
// über `matchPos`. Ein Befehl ist nur eine zweite Tür zum selben Zustand.

import { FACETS_BY_ID } from '../facets';
import type { LVSummary } from '../index/summary';
import type { Filters } from '../matchPos';
import type { HideMode } from '../../state/filterState';
import type { ViewMode } from '../../state/viewState';
import type { ViewerAction } from '../../state/viewer';
import type { LVNode } from '../../types/lvNode';

/** Gruppe in der Trefferliste; zugleich die Reihenfolge der Abschnitte. */
export type CommandGroup = 'Position' | 'Ansicht' | 'Filter';

export const COMMAND_GROUPS: readonly CommandGroup[] = ['Ansicht', 'Filter', 'Position'];

/**
 * Reihenfolge der Abschnitte zur Eingabe.
 *
 * Wer eine Nummer tippt, sucht eine Position — die gehört dann nach oben.
 * Wer ein Wort tippt, meint fast immer einen Befehl: „gewerk" soll den
 * Gewerkefilter bringen und nicht die Position, in deren Kurztext zufällig
 * „Baunebengewerk" steht.
 */
export function groupOrder(query: string): readonly CommandGroup[] {
  return /^\s*\d/.test(query) ? ['Position', 'Ansicht', 'Filter'] : COMMAND_GROUPS;
}

export interface Command {
  /** Eindeutig über alle Gruppen — dient als React-Key und im Test als Anker. */
  id: string;
  group: CommandGroup;
  /** Der Text, der angezeigt **und** gesucht wird. */
  label: string;
  /** Rechts in der Zeile: Zähler, Kurztext, aktueller Zustand. */
  hint?: string;
  /** Bereits aktiv — die Zeile steht dann blau, wie ein gesetzter Filter. */
  on?: boolean;
  /** Was beim Auslösen passiert, der Reihe nach. */
  actions: readonly ViewerAction[];
}

/** Ansichten in der Reihenfolge des Umschalters in der Kopfleiste. */
const VIEWS: readonly { mode: ViewMode; label: string }[] = [
  { mode: 'overview', label: 'Überblick' },
  { mode: 'graph', label: 'Graph' },
  { mode: 'table', label: 'Tabelle' },
  { mode: 'matrix', label: 'Matrix' },
  { mode: 'similar', label: 'Ähnlichkeit' },
  { mode: 'compare', label: 'Vergleich' },
  { mode: 'check', label: 'Prüfung' },
];

function toggled(values: ReadonlySet<string> | undefined, value: string): Set<string> {
  const next = new Set(values ?? []);
  if (!next.delete(value)) next.add(value);
  return next;
}

export interface CommandContext {
  summary: LVSummary;
  filters: Filters;
  search: string;
  hideMode: HideMode;
  view: ViewMode;
}

/**
 * Alle Befehle, die nicht von der Eingabe abhängen: Ansicht wechseln, einen
 * Facettenwert an- oder abschalten, zurücksetzen. Positions-Sprünge entstehen
 * erst aus der Eingabe (`positionCommands`).
 */
export function buildCommands({
  summary,
  filters,
  search,
  hideMode,
  view,
}: CommandContext): Command[] {
  const commands: Command[] = [];

  for (const { mode, label } of VIEWS) {
    commands.push({
      id: `view:${mode}`,
      group: 'Ansicht',
      label,
      on: view === mode,
      hint: view === mode ? 'aktiv' : undefined,
      actions: [{ type: 'setViewMode', mode }],
    });
  }

  for (const [facetId, values] of summary.facets) {
    const facet = FACETS_BY_ID.get(facetId);
    if (facet === undefined) continue;
    const gesetzt = filters.facets[facetId];
    for (const [value, count] of values) {
      const on = gesetzt?.has(value) === true;
      commands.push({
        id: `facet:${facetId}:${value}`,
        group: 'Filter',
        // Facettenname mit im Text: „Gewerk Betonarbeiten" findet sich auch
        // über das Gewerk, nicht nur über den Wert.
        label: `${facet.label} ${facet.optionLabel?.(value) ?? value}`,
        hint: String(count),
        on,
        actions: [{ type: 'setFacet', facetId, values: toggled(gesetzt, value) }],
      });
    }
  }

  if (Object.keys(filters.facets).length > 0 || filters.menge !== null) {
    commands.push({
      id: 'filter:reset',
      group: 'Filter',
      label: 'Filter zurücksetzen',
      actions: [{ type: 'resetFilters' }],
    });
  }
  if (search !== '') {
    commands.push({
      id: 'filter:clearSearch',
      group: 'Filter',
      label: 'Suche leeren',
      hint: search,
      actions: [{ type: 'search', value: '' }],
    });
  }

  const anderer: HideMode = hideMode === 'dim' ? 'hide' : 'dim';
  commands.push({
    id: `filter:hideMode:${anderer}`,
    group: 'Filter',
    label: anderer === 'hide' ? 'Nicht-Treffer ausblenden' : 'Nicht-Treffer dämpfen',
    actions: [{ type: 'hideMode', value: anderer }],
  });

  return commands;
}

/**
 * Ein Sprung zu einer Position.
 *
 * Die Auswahl allein genügt nicht: im Überblick, in der Matrix oder in der
 * Prüfung ist eine einzelne Position gar nicht zu sehen, der Sprung bliebe
 * unsichtbar. Deshalb geht er in die Tabelle — außer im Graphen, der die
 * Auswahl selbst als Karte zeigt.
 */
export function positionCommand(node: LVNode, parent: LVNode | null, view: ViewMode): Command {
  const position = node.position;
  const actions: ViewerAction[] = [
    { type: 'selectPosition', nodeId: parent?.id ?? null, positionId: node.id },
  ];
  if (view !== 'graph') actions.push({ type: 'setViewMode', mode: 'table' });
  return {
    id: `position:${node.id}`,
    group: 'Position',
    // OZ und Kurztext stehen beide im Text: getippt wird mal das eine, mal das
    // andere — „01.02.0030" genauso wie „Sohlplatte".
    label: `${position?.oz ?? node.code} ${position?.shortText ?? node.label ?? ''}`.trim(),
    hint: position?.unit ?? undefined,
    actions,
  };
}
