// STLB-Bau-Leistungsbereiche (LB) als Referenzkatalog: Nummer und Bezeichnung.
// Der Katalog wird zur Build-Zeit als Rohtext eingebunden (kein fetch, kein
// Netzwerk-Request zur Laufzeit); gelesen wird er mit dem gemeinsamen
// CSV-Leser aus lib/csv.ts. Inhaltlich gepflegt wird er unter
// docs/domain/reference/stlb-bau-leistungsbereiche.csv; tests/classify/stlbCatalog.test.ts
// hält beide Dateien deckungsgleich.
//
// Welche Wörter auf einen LB zeigen, steht nicht hier, sondern in der
// Mappingtabelle (mapping.ts, Dimension `leistungsbereich`).

import catalogCsv from './data/stlb-bau-leistungsbereiche.csv?raw';
import { parseCsv } from '../csv';

export interface StlbLeistungsbereich {
  /** LB-Nummer, z. B. "013" — stabiler Ruleset-Key (nicht die Bezeichnung). */
  lbNummer: string;
  lbBezeichnung: string;
  quelleVersion: string | null;
}

export function parseStlbCsv(csv: string): StlbLeistungsbereich[] {
  const entries: StlbLeistungsbereich[] = [];
  for (const row of parseCsv(csv)) {
    const lbNummer = row.get('lb_nummer');
    const lbBezeichnung = row.get('lb_bezeichnung');
    if (lbNummer === '' || lbBezeichnung === '') continue;

    const rawVersion = row.get('quelle_version');
    entries.push({ lbNummer, lbBezeichnung, quelleVersion: rawVersion === '' ? null : rawVersion });
  }
  return entries;
}

let bundled: StlbLeistungsbereich[] | null = null;

/** Der mitgelieferte Referenzkatalog; leer, solange die CSV keine LB-Zeilen hat. */
export function getStlbCatalog(): StlbLeistungsbereich[] {
  bundled ??= parseStlbCsv(catalogCsv);
  return bundled;
}
