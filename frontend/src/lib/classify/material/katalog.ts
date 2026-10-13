// Materialwissen als Daten (docs/decisions/0045-materialwissen-als-tabelle.md).
// Eine CSV je Material unter docs/domain/reference/material/, ausgeliefert als
// Kopie in ./data/ (Build-Zeit-Asset, kein Fetch). Der Code kennt kein Material
// beim Namen — ein neues Material ist eine neue Datei.
//
// Spalten: merkmal · wert · stichworte · ausser · bemerkung
//  - merkmal „Erkennung": woran das Material zu erkennen ist; `wert` bleibt leer.
//  - jedes andere Merkmal: `wert` wird gesetzt, wenn eines der Stichworte trifft.
//    Ohne `wert` steht der gefundene Text selbst als Wert („C#/#" ⇒ „C30/37").
//  - ausser: Fundstellen, die trotz Treffer nicht zählen („betonstahl*").
//  - bemerkung: nur für Menschen.

import { parseCsv, type CsvRow } from '../../csv';
import { compileAusser, compileStichworte, splitStichworte } from './stichwort';

export interface Matcher {
  /** Global, damit `matchAll` jede Fundstelle liefert. */
  readonly pattern: RegExp;
  readonly ausser: RegExp | null;
  /** Die Stichworte der Zelle, wie sie in der Tabelle stehen — fürs Treffer-Protokoll. */
  readonly stichworte: readonly string[];
  /** Zeile in der Tabelle (Kopfzeile = 1). */
  readonly zeile: number;
}

export interface MerkmalWert {
  /** `null` ⇒ der gefundene Text ist der Wert. */
  readonly wert: string | null;
  readonly matcher: Matcher;
}

export interface MaterialMerkmal {
  /** Attribut-Key, z. B. `betonBauweise`. */
  readonly key: string;
  /** Spaltenwert, wie er in der Tabelle steht, z. B. „Bauweise". */
  readonly name: string;
  readonly werte: readonly MerkmalWert[];
}

export interface MaterialDefinition {
  /** Aus dem Dateinamen, z. B. `beton`. */
  readonly id: string;
  /** Dateiname der Tabelle, z. B. „beton.csv". */
  readonly datei: string;
  /** Anzeigename, z. B. „Beton". */
  readonly name: string;
  /** Je Erkennungszeile ein Matcher — ein `ausser` gilt nur für seine Zeile. */
  readonly erkennung: readonly Matcher[];
  readonly merkmale: readonly MaterialMerkmal[];
}

const ERKENNUNG = 'erkennung';

/** „Bauweise" → „bauweise", „Größe" → „groesse": taugt als Teil eines Attribut-Keys. */
function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function matcher(row: CsvRow): Matcher | null {
  const stichworte = splitStichworte(row.get('stichworte'));
  const pattern = compileStichworte(stichworte);
  if (pattern === null) return null;
  const ausser = compileAusser(splitStichworte(row.get('ausser')));
  return { pattern, ausser, stichworte, zeile: row.line };
}

/** Eine Materialtabelle lesen. `fileName` ohne Pfad, z. B. „beton.csv". */
export function parseMaterialCsv(fileName: string, csv: string): MaterialDefinition {
  const base = fileName.replace(/\.csv$/i, '');
  const id = slug(base);
  const erkennung: Matcher[] = [];
  const merkmale = new Map<string, { name: string; werte: MerkmalWert[] }>();

  for (const row of parseCsv(csv)) {
    const name = row.get('merkmal');
    if (name === '') continue;
    if (name.toLowerCase() === ERKENNUNG) {
      const found = matcher(row);
      if (found !== null) erkennung.push(found);
      continue;
    }
    const found = matcher(row);
    if (found === null) continue;
    const key = id + capitalize(slug(name));
    const entry = merkmale.get(key) ?? { name, werte: [] };
    const wert = row.get('wert');
    entry.werte.push({ wert: wert === '' ? null : wert, matcher: found });
    merkmale.set(key, entry);
  }

  return {
    id,
    datei: fileName,
    name: capitalize(base.replace(/[-_]+/g, ' ')),
    erkennung,
    merkmale: [...merkmale].map(([key, { name, werte }]) => ({ key, name, werte })),
  };
}

let katalog: readonly MaterialDefinition[] | null = null;

/** Alle ausgelieferten Materialtabellen, nach Dateiname sortiert. */
export function materialKatalog(): readonly MaterialDefinition[] {
  katalog ??= Object.entries(
    import.meta.glob<string>('./data/*.csv', { query: '?raw', import: 'default', eager: true }),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, csv]) => parseMaterialCsv(path.split('/').pop() ?? path, csv));
  return katalog;
}

/** Anzeigename je Merkmals-Key, z. B. `betonBauweise` → „Bauweise (Beton)". */
export function materialMerkmalLabels(
  materials: readonly MaterialDefinition[] = materialKatalog(),
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const material of materials) {
    for (const merkmal of material.merkmale) {
      labels[merkmal.key] = `${merkmal.name} (${material.name})`;
    }
  }
  return labels;
}
