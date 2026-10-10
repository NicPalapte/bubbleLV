// Wortgruppen, die mehr als eine Stelle braucht (Issue #107). Liegt eine Gruppe
// nur hier, laufen Klassifizierung und Prüfregeln nicht auseinander, wenn ein
// Begriff dazukommt.
//
// Alle Einträge klein geschrieben; verglichen wird als Teilstring im
// kleingeschriebenen Text. Bewusst nicht-normativ (docs/domain/README.md).
//
// Nicht hier: „Winterbau". Das Stichwort (keywords.ts) und die Frist-Fundstelle
// (extractors/fristen.ts) suchen verschiedene Wörter; zusammengelegt würden
// beide neue Treffer bekommen.

/** Abrechnung nach Aufwand — Positionsart `personal` und Prüfregel V2. */
export const STUNDENLOHN_WORTE: readonly string[] = ['stundenlohn', 'regiearbeit', 'regiestunde'];

/** Vorhalten über die Bauzeit — Nebenleistung und Einrichtungsart „Vorhalten". */
export const VORHALTEN_WORTE: readonly string[] = ['vorhalten', 'vorhaltung'];

/** Werk- und Ausführungsplanung — Positionsart `planung` und Planungsart „Werkplanung". */
export const WERKPLANUNG_WORTE: readonly string[] = [
  'werkplanung',
  'ausführungsplanung',
  'montageplanung',
];

/** Gutachten und Bestandsaufnahme — Positionsart `planung` und Planungsart „Gutachten". */
export const GUTACHTEN_WORTE: readonly string[] = ['gutachten', 'bestandsaufnahme'];
