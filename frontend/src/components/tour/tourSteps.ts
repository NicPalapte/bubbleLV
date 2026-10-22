// Schritte der geführten Tour (Mockup v7, Bereich K). Jeder Schritt zeigt auf
// ein echtes Bedienelement; manche warten, bis man es selbst anklickt.
// Ziele sind `data-tour`-Attribute, damit Umbauten an Klassen die Tour nicht
// stillschweigend brechen. Fehlt ein Ziel (z. B. „⚠ Hinweise" ohne Hinweise),
// überspringt die Tour den Schritt.

import type { ViewerState } from '../../state/viewer';

export interface TourStep {
  /** CSS-Selektor des Ziels; der erste sichtbare Treffer zählt. */
  target: string;
  title: string;
  text: string;
  /** Aufforderung, solange `done` noch nicht erfüllt ist. */
  todo?: string;
  /** Erfüllt → die Tour geht von selbst einen Schritt weiter. */
  done?: (state: ViewerState) => boolean;
  /** Vorbereitung beim Betreten, z. B. ein Fenster schließen. */
  prepare?: readonly TourPrepare[];
  /** Ziel ist ein Punkt im Graphen: Spotlight rund und mindestens so groß. */
  round?: boolean;
}

/** Was ein Schritt vor dem Anzeigen am Zustand ändert. */
export type TourPrepare = 'closeSide' | 'openSettings' | 'closeSelection' | 'ensureSelection';

/** Punkt im Graphen; als Fläche gezeichnete Kreise haben keinen. */
export const POINT_TARGET = '[data-slot]';
export const CARD_TARGET = '[data-selection-card]';

export const TOUR_STEPS: readonly TourStep[] = [
  {
    target: POINT_TARGET,
    title: 'Positionen sind Punkte',
    text: 'Jeder Kreis ist ein Abschnitt, jeder Punkt eine Position.',
    todo: 'Klick auf den markierten Punkt',
    done: (state) => state.selection.positionId !== null,
    prepare: ['closeSide', 'closeSelection'],
    round: true,
  },
  {
    target: CARD_TARGET,
    title: 'Positionskarte',
    text: 'Geld/Menge, Risiko, Norm und Frist sind markiert. „Vergleichen" legt bis zu vier Positionen nebeneinander.',
    prepare: ['ensureSelection'],
  },
  {
    target: '[data-tour="search"]',
    title: 'Suchen',
    text: 'OZ, Kurztext und Langtext. Taste /',
    prepare: ['closeSelection'],
  },
  {
    target: '[data-tour="filter"]',
    title: 'Filter',
    text: 'Nach Abschnitt, Einheit, Menge und mehr.',
    todo: 'Klick auf „+ Filter"',
    done: (state) => state.view.filterBar,
    prepare: ['closeSide'],
  },
  {
    target: '[data-tour="layout"]',
    title: 'Gliederung',
    text: 'Wie im LV oder als Matrix nach Merkmalen in Zeilen und Spalten.',
    prepare: ['openSettings'],
  },
  {
    target: '[data-tour="kpis"]',
    title: 'Kennzahlen',
    text: 'Öffnen Überblick und Prüfung.',
    prepare: ['closeSide'],
  },
  {
    target: '[data-tour="hints"]',
    title: 'Hinweise',
    text: 'Ringe und Schilder im Graphen ein- und ausblenden.',
  },
  {
    target: '[data-tour="workspace"]',
    title: 'Anordnung',
    text: 'Split oder Fenster. Im Split einen Bereich am Kopf auf einen anderen ziehen.',
  },
  {
    target: '[data-tour="table"]',
    title: 'Tabelle',
    text: 'Alle Positionen als Liste. ↗ holt sie auf einen zweiten Bildschirm.',
  },
  {
    target: '[data-tour="menu"]',
    title: 'Alles Weitere',
    text: 'Export, Druck, Fehler melden, Hell/Dunkel und diese Tour.',
  },
];
