// Stufe 0 — STLB-Bau-Leistungsbereiche (LB) als Referenzkatalog.
// Der Katalog wird zur Build-Zeit als Rohtext eingebunden (kein fetch, kein
// Netzwerk-Request zur Laufzeit); gelesen wird er mit dem gemeinsamen
// CSV-Leser aus lib/csv.ts. Inhaltlich gepflegt wird er unter
// docs/domain/reference/stlb-bau-leistungsbereiche.csv; tests/classify/stlbCatalog.test.ts
// hält beide Dateien deckungsgleich.

import catalogCsv from './data/stlb-bau-leistungsbereiche.csv?raw';
import { isPositionsart, type Positionsart } from './types';
import { parseCsv, splitList } from '../csv';

export interface StlbLeistungsbereich {
  /** LB-Nummer, z. B. "013" — stabiler Ruleset-Key (nicht die Bezeichnung). */
  lbNummer: string;
  lbBezeichnung: string;
  /** Nur gesetzt, wenn der LB eindeutig nicht-physisch ist. */
  positionsartDefault: Positionsart | null;
  /** Stichworte für den Textabgleich, kleingeschrieben. */
  keywords: string[];
  quelleVersion: string | null;
}

/**
 * Stichworte, die sich direkt aus der LB-Bezeichnung ableiten lassen, solange die
 * `keywords`-Spalte des Katalogs leer ist. Bewusst eng: nur eigenständige
 * Komposita auf "-arbeiten"/"-anlagen" ("Estricharbeiten", "Kälteanlagen"), weil
 * kürzere Wortstämme ("Beton", "Fenster") in Positionstexten zu unspezifisch sind.
 * Es wird nichts erfunden — die Quelle ist die Katalog-Bezeichnung selbst.
 */
function derivedKeywords(bezeichnung: string): string[] {
  const tokens = bezeichnung.toLowerCase().split(/[^a-zäöüß]+/);
  return tokens.filter(
    (token) => token.length >= 8 && (token.endsWith('arbeiten') || token.endsWith('anlagen')),
  );
}

export function parseStlbCsv(csv: string): StlbLeistungsbereich[] {
  const entries: StlbLeistungsbereich[] = [];
  for (const row of parseCsv(csv)) {
    const lbNummer = row.get('lb_nummer');
    const lbBezeichnung = row.get('lb_bezeichnung');
    if (lbNummer === '' || lbBezeichnung === '') continue;

    const rawDefault = row.get('positionsart_default');
    const explicit = splitList(row.get('keywords'));
    const rawVersion = row.get('quelle_version');

    entries.push({
      lbNummer,
      lbBezeichnung,
      positionsartDefault: isPositionsart(rawDefault) ? rawDefault : null,
      keywords: explicit.length > 0 ? explicit : derivedKeywords(lbBezeichnung),
      quelleVersion: rawVersion === '' ? null : rawVersion,
    });
  }
  return entries;
}

let bundled: StlbLeistungsbereich[] | null = null;

/** Der mitgelieferte Referenzkatalog; leer, solange die CSV keine LB-Zeilen hat. */
export function getStlbCatalog(): StlbLeistungsbereich[] {
  bundled ??= parseStlbCsv(catalogCsv);
  return bundled;
}

export interface StlbMatch {
  lb: StlbLeistungsbereich;
  /** Das Stichwort, das den Treffer ausgelöst hat. */
  keyword: string;
}

/**
 * Längstes passendes Stichwort gewinnt — "stahlbetonarbeiten" schlägt
 * "betonarbeiten", falls beide im Katalog stehen. Kein Treffer → null, kein Fehler.
 */
export function matchStlb(text: string, catalog: StlbLeistungsbereich[]): StlbMatch | null {
  let best: StlbMatch | null = null;
  for (const lb of catalog) {
    for (const keyword of lb.keywords) {
      if (!text.includes(keyword)) continue;
      if (best === null || keyword.length > best.keyword.length) best = { lb, keyword };
    }
  }
  return best;
}
