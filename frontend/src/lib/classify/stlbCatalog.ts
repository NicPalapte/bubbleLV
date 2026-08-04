// Stufe 0 — STLB-Bau-Leistungsbereiche (LB) als Referenzkatalog.
// Der Katalog wird zur Build-Zeit als Rohtext eingebunden (kein fetch, kein
// Netzwerk-Request zur Laufzeit). Inhaltlich gepflegt wird er unter
// docs/domain/reference/stlb-bau-leistungsbereiche.csv; tests/classify/stlbCatalog.test.ts
// hält beide Dateien deckungsgleich.

import catalogCsv from './data/stlb-bau-leistungsbereiche.csv?raw';
import { isPositionsart, type Positionsart } from './types';

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
 * Eine CSV-Zeile in Felder zerlegen. Bewusst minimal: Trennzeichen `,`,
 * doppelte Anführungszeichen für Felder mit Komma, `""` als escaptes Zitat.
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char !== '"') current += char;
      else if (line[i + 1] === '"') {
        current += '"';
        i++;
      } else quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      fields.push(current);
      current = '';
    } else current += char;
  }
  fields.push(current);
  return fields.map((field) => field.trim());
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
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map((field) => field.toLowerCase());
  const column = (name: string): number => header.indexOf(name);
  const idxNummer = column('lb_nummer');
  const idxBezeichnung = column('lb_bezeichnung');
  const idxDefault = column('positionsart_default');
  const idxKeywords = column('keywords');
  const idxVersion = column('quelle_version');
  if (idxNummer < 0 || idxBezeichnung < 0) return [];

  const entries: StlbLeistungsbereich[] = [];
  for (const line of lines.slice(1)) {
    const fields = splitCsvLine(line);
    const lbNummer = fields[idxNummer] ?? '';
    const lbBezeichnung = fields[idxBezeichnung] ?? '';
    if (lbNummer === '' || lbBezeichnung === '') continue;

    const rawDefault = idxDefault < 0 ? '' : (fields[idxDefault] ?? '');
    const rawKeywords = idxKeywords < 0 ? '' : (fields[idxKeywords] ?? '');
    const explicit = rawKeywords
      .split('|')
      .map((keyword) => keyword.trim().toLowerCase())
      .filter((keyword) => keyword !== '');
    const rawVersion = idxVersion < 0 ? '' : (fields[idxVersion] ?? '');

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
