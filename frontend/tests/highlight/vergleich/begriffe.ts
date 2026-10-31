// Erfundene gelernte Begriffe für den Vergleich der Hervorhebungen vor und nach dem Umzug
// ins Regelformat (Entscheidung 0085, Schritt 4). Gewählt, damit sie in den Test-LVs
// treffen: Muster mit `#` und `*`, mehrere Wörter, Überschneidungen, „Nicht hervorheben“.

import type { LearnedTerm } from '../../../src/lib/highlight/terms';

export const BEGRIFFE: LearnedTerm[] = [
  { begriff: 'Beton*', kategorie: 'material' },
  { begriff: 'Stahl', kategorie: 'material' },
  { begriff: 'Kies', kategorie: 'material' },
  { begriff: 'Mörtel*', kategorie: 'material' },
  { begriff: 'Holz*', kategorie: 'material' },
  { begriff: '# mm', kategorie: 'masse' },
  { begriff: '# cm', kategorie: 'masse' },
  { begriff: 'DN #', kategorie: 'masse' },
  { begriff: 'd = # cm', kategorie: 'masse' },
  { begriff: 'bauseits', kategorie: 'wichtig' },
  { begriff: 'Abstimmung mit der Bauleitung', kategorie: 'wichtig' },
  { begriff: 'Bauleitung', kategorie: 'wichtig' },
  { begriff: 'auf Anordnung*', kategorie: 'wichtig' },
  { begriff: 'DIN', kategorie: 'aus' },
  { begriff: 'gemäß', kategorie: 'aus' },
];

/** Erfundene Langtexte für Grenzfälle, ohne Fundstellen der Erkennung. */
export const TEXTE: string[] = [
  'Betonstahl liefern, Beton C25/30 nach Abstimmung mit der Bauleitung einbauen.',
  'Rohr DN 150, Wandstärke d = 24 cm, Fugen 10 mm, bauseits gestellt.',
  'Holzschalung gemäß DIN 18331, Mörtelgruppe III, Kies 0/32.',
  'Nur auf Anordnung der Bauleitung. Stahlträger und STAHL in Großschreibung.',
  'Ausführung binnen 14 Tagen auf Anordnung der Bauleitung, sonst Vertragsstrafe.',
  '',
];
